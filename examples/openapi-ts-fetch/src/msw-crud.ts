/**
 * MSW CRUD store utility for use with @hey-api/openapi-ts generated MSW handlers.
 *
 * Provides an in-memory store and resolver factories that plug directly into
 * the generated mock handler functions (e.g. `addPetMock`, `getPetByIdMock`).
 */
import { HttpResponse, type HttpResponseResolver, type PathParams } from 'msw';

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export interface CrudStore<T> {
  /** Clear all items */
  clear(): void;
  /** Create (or overwrite) an item */
  create(item: T): T;
  /** Delete by id – returns `true` if the item existed */
  delete(id: string): boolean;
  /** Return every item (optionally filtered) */
  getAll(predicate?: (item: T) => boolean): T[];
  /** Retrieve a single item by id */
  getById(id: string): T | undefined;
  /** Bulk-insert items (additive, does not clear first) */
  seed(items: T[]): void;
  /** Update an existing item – returns `undefined` when the id is unknown */
  update(id: string, item: T): T | undefined;
}

export function createCrudStore<T>(getId: (item: T) => string): CrudStore<T> {
  const items = new Map<string, T>();
  return {
    clear: () => items.clear(),
    create(item) {
      items.set(getId(item), item);
      return item;
    },
    delete: (id) => items.delete(id),
    getAll: (predicate) => {
      const all = [...items.values()];
      return predicate ? all.filter(predicate) : all;
    },
    getById: (id) => items.get(id),
    seed(data) {
      for (const d of data) {
        items.set(getId(d), d);
      }
    },
    update(id, item) {
      if (!items.has(id)) {
        return undefined;
      }
      items.set(id, item);
      return item;
    },
  };
}

// ---------------------------------------------------------------------------
// Resolver factories
// ---------------------------------------------------------------------------

/**
 * A set of resolver factories backed by a `CrudStore`.
 *
 * Each factory returns a plain function that satisfies
 * `HttpResponseResolver<any, any>`, which is assignable to every concrete
 * `HttpResponseResolver<Params, Body>` the generated mock helpers expect
 * (function parameter contravariance — a function that accepts *broader*
 * params is assignable to one that declares *narrower* params).
 */
type ExtractId = (params: Record<string, string>) => string;

export interface CrudResolversOptions<T> {
  /** Extract the entity id from the entity itself (e.g. `(pet) => String(pet.id)`). */
  getId: (item: T) => string;
  /**
   * Extract the entity id from path params (e.g. `(p) => p.petId`).
   * Configured once here so `getById()`, `delete()`, and `update()` don't
   * need it repeated on every call.
   */
  getIdFromParams: ExtractId;
  /** Optionally bring your own store instance. */
  store?: CrudStore<T>;
}

export interface CrudResolvers<T> {
  /**
   * Returns a resolver that parses the JSON body, passes it through
   * `toEntity` to attach server-generated fields (id, timestamps, etc.),
   * stores the result, and responds with 201 + the created entity.
   *
   * The body type `B` is intentionally decoupled from `T` because create
   * endpoints typically don't accept an id — it's generated server-side.
   */
  create<B = Partial<T>>(toEntity: (body: B) => T): HttpResponseResolver<PathParams, B>;

  /**
   * Returns a resolver that deletes by id extracted from path params
   * (using `getIdFromParams` from options).
   * Responds 204 on success, 404 when the id is unknown.
   */
  delete(): HttpResponseResolver<PathParams>;

  /**
   * Returns a resolver that retrieves one item by id extracted from path
   * params (using `getIdFromParams` from options).
   * Responds with the JSON entity or 404.
   */
  getById(): HttpResponseResolver<PathParams>;

  /**
   * Returns a resolver that responds with every item in the store
   * (optionally filtered).
   */
  list(predicate?: (item: T) => boolean): HttpResponseResolver<PathParams>;

  /** Direct access to the backing store for seeding / assertions. */
  store: CrudStore<T>;

  /**
   * Returns a resolver that parses the JSON body, resolves the id from
   * path params (via `getIdFromParams`) or from the entity itself (via
   * `getId`), updates the store, and responds with the updated entity
   * or 404.
   */
  update(options?: {
    /** Override: extract id from body instead of path params. */
    idFrom?: 'body';
  }): HttpResponseResolver<PathParams, T>;
}

export function createCrudResolvers<T>(options: CrudResolversOptions<T>): CrudResolvers<T> {
  const { getId, getIdFromParams } = options;
  const store = options.store ?? createCrudStore(getId);
  return {
    create:
      (toEntity): HttpResponseResolver<PathParams> =>
      async ({ request }) => {
        const body = await request.json();
        const item = store.create(toEntity(body));
        return HttpResponse.json(item, { status: 201 });
      },

    delete:
      (): HttpResponseResolver<PathParams> =>
      ({ params }) => {
        const id = getIdFromParams(params as Record<string, string>);
        if (!store.delete(id)) {
          return new HttpResponse(null, { status: 404 });
        }
        return new HttpResponse(null, { status: 204 });
      },

    getById:
      (): HttpResponseResolver<PathParams> =>
      ({ params }) => {
        const id = getIdFromParams(params as Record<string, string>);
        const item = store.getById(id);
        if (!item) {
          return new HttpResponse(null, { status: 404 });
        }
        return HttpResponse.json(item);
      },

    list:
      (predicate?): HttpResponseResolver<PathParams> =>
      () =>
        HttpResponse.json(store.getAll(predicate)),

    store,

    update:
      (updateOptions?): HttpResponseResolver<PathParams, T> =>
      async ({ params, request }) => {
        const body = (await request.json()) as T;
        const id =
          updateOptions?.idFrom === 'body'
            ? getId(body)
            : getIdFromParams(params as Record<string, string>);
        const updated = store.update(id, body);
        if (!updated) {
          return new HttpResponse(null, { status: 404 });
        }
        return HttpResponse.json(updated);
      },
  };
}

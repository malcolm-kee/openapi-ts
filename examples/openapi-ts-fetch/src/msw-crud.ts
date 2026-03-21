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
export interface CrudResolvers<T> {
  /**
   * Returns a resolver that parses the JSON body, passes it through an
   * optional `prepare` callback (e.g. to assign an id), stores the result,
   * and responds with 201 + the created entity.
   */
  create(prepare?: (body: T) => T): HttpResponseResolver<PathParams, T>;

  /**
   * Returns a resolver that deletes by id extracted from path params.
   * Responds 204 on success, 404 when the id is unknown.
   */
  delete(extractId: (params: Record<string, string>) => string): HttpResponseResolver<PathParams>;

  /**
   * Returns a resolver that retrieves one item by id extracted from path
   * params.  Responds with the JSON entity or 404.
   */
  getById(extractId: (params: Record<string, string>) => string): HttpResponseResolver<PathParams>;

  /**
   * Returns a resolver that responds with every item in the store
   * (optionally filtered).
   */
  list(predicate?: (item: T) => boolean): HttpResponseResolver<PathParams>;

  /** Direct access to the backing store for seeding / assertions. */
  store: CrudStore<T>;

  /**
   * Returns a resolver that parses the JSON body, resolves the id either
   * from path params or from the entity itself, updates the store, and
   * responds with the updated entity or 404.
   */
  update(
    extractId?: (params: Record<string, string>) => string,
  ): HttpResponseResolver<PathParams, T>;
}

export function createCrudResolvers<T>(
  getId: (item: T) => string,
  store: CrudStore<T> = createCrudStore(getId),
): CrudResolvers<T> {
  return {
    create:
      (prepare?): HttpResponseResolver<PathParams, T> =>
      async ({ request }) => {
        const body = (await request.json()) as T;
        const item = prepare ? prepare(body) : body;
        store.create(item);
        return HttpResponse.json(item, { status: 201 });
      },

    delete:
      (extractId): HttpResponseResolver<PathParams> =>
      ({ params }) => {
        const id = extractId(params as Record<string, string>);
        if (!store.delete(id)) {
          return new HttpResponse(null, { status: 404 });
        }
        return new HttpResponse(null, { status: 204 });
      },

    getById:
      (extractId): HttpResponseResolver<PathParams> =>
      ({ params }) => {
        const id = extractId(params as Record<string, string>);
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
      (extractId?): HttpResponseResolver<PathParams, T> =>
      async ({ params, request }) => {
        const body = (await request.json()) as T;
        const id = extractId ? extractId(params as Record<string, string>) : getId(body);
        const updated = store.update(id, body);
        if (!updated) {
          return new HttpResponse(null, { status: 404 });
        }
        return HttpResponse.json(updated);
      },
  };
}

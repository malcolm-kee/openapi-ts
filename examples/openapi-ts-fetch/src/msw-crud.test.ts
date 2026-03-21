import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createMswHandlerFactory } from './client/msw.gen';
import type { Pet } from './client/types.gen';
import { createCrudResolvers } from './msw-crud';

// ---------------------------------------------------------------------------
// Wire up CRUD resolvers to the generated Petstore MSW handlers
// ---------------------------------------------------------------------------

const mock = createMswHandlerFactory({ baseUrl: 'https://petstore3.swagger.io/api/v3' });

const petCrud = createCrudResolvers<Pet>((pet) => String(pet.id));

// Seed some data
petCrud.store.seed([
  { id: 1, name: 'Fido', photoUrls: ['/fido.jpg'], status: 'available' },
  { id: 2, name: 'Buddy', photoUrls: ['/buddy.jpg'], status: 'pending' },
  { id: 3, name: 'Max', photoUrls: ['/max.jpg'], status: 'sold' },
]);

let nextId = 100;

const handlers = [
  // CREATE – POST /pet
  mock.addPetMock(petCrud.create((body) => ({ ...body, id: nextId++ }))),

  // LIST – GET /pet/findByStatus  (must be before :petId to avoid greedy match)
  mock.findPetsByStatusMock(petCrud.list()),

  // LIST (filtered) – GET /pet/findByTags
  mock.findPetsByTagsMock(petCrud.list((pet) => pet.status === 'available')),

  // READ one – GET /pet/:petId
  mock.getPetByIdMock(petCrud.getById((p) => p.petId)),

  // UPDATE – PUT /pet  (id comes from the body, not the URL)
  mock.updatePetMock(petCrud.update()),

  // DELETE – DELETE /pet/:petId
  mock.deletePetMock(petCrud.delete((p) => p.petId)),
];

// ---------------------------------------------------------------------------
// Test server
// ---------------------------------------------------------------------------

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  // Re-seed between tests for isolation
  petCrud.store.clear();
  petCrud.store.seed([
    { id: 1, name: 'Fido', photoUrls: ['/fido.jpg'], status: 'available' },
    { id: 2, name: 'Buddy', photoUrls: ['/buddy.jpg'], status: 'pending' },
    { id: 3, name: 'Max', photoUrls: ['/max.jpg'], status: 'sold' },
  ]);
  nextId = 100;
});
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const BASE = 'https://petstore3.swagger.io/api/v3';

describe('MSW CRUD helpers – Petstore', () => {
  it('lists all pets', async () => {
    const res = await fetch(`${BASE}/pet/findByStatus`);
    expect(res.status).toBe(200);

    const pets: Pet[] = await res.json();
    expect(pets).toHaveLength(3);
    expect(pets.map((p) => p.name)).toEqual(['Fido', 'Buddy', 'Max']);
  });

  it('lists filtered pets', async () => {
    const res = await fetch(`${BASE}/pet/findByTags`);
    const pets: Pet[] = await res.json();
    // Only "available" pets
    expect(pets).toHaveLength(1);
    expect(pets[0].name).toBe('Fido');
  });

  it('gets a pet by id', async () => {
    const res = await fetch(`${BASE}/pet/1`);
    expect(res.status).toBe(200);

    const pet: Pet = await res.json();
    expect(pet.name).toBe('Fido');
  });

  it('returns 404 for unknown pet', async () => {
    const res = await fetch(`${BASE}/pet/999`);
    expect(res.status).toBe(404);
  });

  it('creates a pet', async () => {
    const res = await fetch(`${BASE}/pet`, {
      body: JSON.stringify({ name: 'Luna', photoUrls: ['/luna.jpg'] }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    expect(res.status).toBe(201);

    const created: Pet = await res.json();
    expect(created.id).toBe(100);
    expect(created.name).toBe('Luna');

    // Verify it's in the store
    const get = await fetch(`${BASE}/pet/100`);
    expect(get.status).toBe(200);
    expect((await get.json()).name).toBe('Luna');
  });

  it('updates a pet', async () => {
    const res = await fetch(`${BASE}/pet`, {
      body: JSON.stringify({ id: 1, name: 'Fido Updated', photoUrls: ['/fido2.jpg'] }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT',
    });
    expect(res.status).toBe(200);

    const updated: Pet = await res.json();
    expect(updated.name).toBe('Fido Updated');

    // Confirm persisted
    const get = await fetch(`${BASE}/pet/1`);
    expect((await get.json()).name).toBe('Fido Updated');
  });

  it('returns 404 when updating non-existent pet', async () => {
    const res = await fetch(`${BASE}/pet`, {
      body: JSON.stringify({ id: 999, name: 'Ghost', photoUrls: [] }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT',
    });
    expect(res.status).toBe(404);
  });

  it('deletes a pet', async () => {
    const res = await fetch(`${BASE}/pet/2`, { method: 'DELETE' });
    expect(res.status).toBe(204);

    // Confirm gone
    const get = await fetch(`${BASE}/pet/2`);
    expect(get.status).toBe(404);

    // Others still there
    const list = await fetch(`${BASE}/pet/findByStatus`);
    expect(await list.json()).toHaveLength(2);
  });

  it('returns 404 when deleting non-existent pet', async () => {
    const res = await fetch(`${BASE}/pet/999`, { method: 'DELETE' });
    expect(res.status).toBe(404);
  });

  it('supports full CRUD lifecycle', async () => {
    // Create
    const createRes = await fetch(`${BASE}/pet`, {
      body: JSON.stringify({ name: 'Ziggy', photoUrls: [] }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const created: Pet = await createRes.json();
    const id = created.id!;

    // Read
    const readRes = await fetch(`${BASE}/pet/${id}`);
    expect((await readRes.json()).name).toBe('Ziggy');

    // Update
    await fetch(`${BASE}/pet`, {
      body: JSON.stringify({ id, name: 'Ziggy II', photoUrls: [] }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT',
    });
    const readRes2 = await fetch(`${BASE}/pet/${id}`);
    expect((await readRes2.json()).name).toBe('Ziggy II');

    // Delete
    const delRes = await fetch(`${BASE}/pet/${id}`, { method: 'DELETE' });
    expect(delRes.status).toBe(204);

    // Confirm gone
    const readRes3 = await fetch(`${BASE}/pet/${id}`);
    expect(readRes3.status).toBe(404);
  });
});

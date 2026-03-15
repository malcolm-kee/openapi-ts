import { type HttpHandler, HttpResponse } from 'msw';
import { describe, expectTypeOf, it } from 'vitest';

import { createMswHandlerFactory } from '../src/client/msw.gen';
import type { Order, Pet } from '../src/client/types.gen';

const createMock = createMswHandlerFactory();

describe('MSW plugin type-level tests', () => {
  describe('static response values', () => {
    it('accepts correct response type (Pet) with status', () => {
      const pet: Pet = { name: 'Fido', photoUrls: [] };
      createMock.of.getPetById({ result: pet, status: 200 });
      createMock.of.addPet({ result: pet, status: 200 });
      createMock.of.updatePet({ result: pet, status: 200 });
      createMock.of.findPetsByStatus({ result: [pet], status: 200 });
    });

    it('accepts correct response type (Order) with status', () => {
      const order: Order = { id: 1, petId: 1, quantity: 1 };
      createMock.of.placeOrder({ result: order, status: 200 });
      createMock.of.getOrderById({ result: order, status: 200 });
    });

    it('accepts correct response type (string) with status', () => {
      createMock.of.loginUser({ result: 'session-token', status: 200 });
    });

    it('accepts correct response type (record) with status', () => {
      createMock.of.getInventory({ result: { available: 10, pending: 5 }, status: 200 });
    });

    it('rejects wrong response type for getPetById', () => {
      // @ts-expect-error - string is not a valid Pet response
      createMock.of.getPetById({ result: 'wrong type', status: 200 });
    });

    it('rejects wrong response type for addPet', () => {
      // @ts-expect-error - number is not a valid Pet response
      createMock.of.addPet({ result: 42, status: 200 });
    });

    it('rejects wrong response type for findPetsByStatus', () => {
      // @ts-expect-error - a single Pet is not Array<Pet>
      createMock.of.findPetsByStatus({ result: { name: 'Fido', photoUrls: [] }, status: 200 });
    });

    it('rejects wrong response type for placeOrder', () => {
      // @ts-expect-error - Pet is not a valid Order response
      createMock.of.placeOrder({ result: { name: 'Fido', photoUrls: [] }, status: 200 });
    });

    it('rejects wrong response type for loginUser', () => {
      // @ts-expect-error - number is not a valid string response
      createMock.of.loginUser({ result: 123, status: 200 });
    });

    it('rejects wrong status code', () => {
      const pet: Pet = { name: 'Fido', photoUrls: [] };
      // @ts-expect-error - 999 is not a valid status code
      createMock.of.getPetById({ result: pet, status: 999 });
    });
  });

  describe('void operations accept no arguments', () => {
    it('logoutUser accepts no arguments', () => {
      createMock.of.logoutUser();
    });

    it('deletePet accepts no arguments', () => {
      createMock.of.deletePet();
    });

    it('deleteOrder accepts no arguments', () => {
      createMock.of.deleteOrder();
    });

    it('deleteUser accepts no arguments', () => {
      createMock.of.deleteUser();
    });
  });

  describe('resolver function typing', () => {
    it('accepts HttpResponseResolver', () => {
      createMock.of.getInventory(() => HttpResponse.json({ available: 1 }));
    });

    it('accepts async HttpResponseResolver', () => {
      createMock.of.getInventory(async () => HttpResponse.json({ available: 1 }));
    });

    it('resolver for path-param operation receives typed params', () => {
      createMock.of.getPetById(({ params }) => {
        // params.petId should be string (StringifyPathParams)
        expectTypeOf(params.petId).toEqualTypeOf<string | ReadonlyArray<string>>();
        return HttpResponse.json({ name: 'Test', photoUrls: [] });
      });
    });

    it('resolver for body operation receives typed body via request', () => {
      createMock.of.addPet(async ({ request }) => {
        const body = await request.json();
        // body should be typed as Pet (AddPetData['body'])
        expectTypeOf(body).toEqualTypeOf<Pet>();
        return HttpResponse.json({ name: body.name, photoUrls: body.photoUrls });
      });
    });

    it('resolver for void operation is typed correctly', () => {
      createMock.of.logoutUser(() => HttpResponse.json(null));
    });

    it('resolver for void operation with path params', () => {
      createMock.of.deletePet(({ params }) => {
        expectTypeOf(params.petId).toEqualTypeOf<string | ReadonlyArray<string>>();
        return new HttpResponse(null);
      });
    });
  });

  describe('return type', () => {
    it('all handler creators return HttpHandler', () => {
      const handler = createMock.of.getPetById({
        result: { name: 'Test', photoUrls: [] },
        status: 200,
      });
      expectTypeOf(handler).toExtend<HttpHandler>();
    });
  });

  describe('factory configuration', () => {
    it('accepts optional config', () => {
      createMswHandlerFactory();
      createMswHandlerFactory({});
      createMswHandlerFactory({ baseUrl: 'http://localhost:3000' });
    });
  });
});

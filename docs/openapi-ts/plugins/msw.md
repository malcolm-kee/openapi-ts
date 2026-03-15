---
title: MSW
description: MSW plugin for Hey API. Compatible with all our features.
---

<script setup lang="ts">
</script>

# MSW

### About

[MSW](https://mswjs.io) is an API mocking library that allows you to write client-agnostic mocks and reuse them across any frameworks, tools, and environments.

The MSW plugin for Hey API generates type-safe mock handler factories from your OpenAPI spec, removing the tedious work of defining mock endpoints and ensuring your mocks stay in sync with your API.

## Features

- type-safe mock handlers generated from your OpenAPI spec
- seamless integration with `@hey-api/openapi-ts` ecosystem
- support for static response values or custom MSW resolver functions
- typed path parameters and request bodies
- automatic base URL inference from OpenAPI `servers` field
- minimal learning curve thanks to extending the underlying technology

## Installation

::: warning
MSW plugin requires `msw@^2` as a peer dependency. Make sure to install it in your project.
:::

In your [configuration](/openapi-ts/get-started), add `msw` to your plugins and you'll be ready to generate MSW artifacts. :tada:

```js
export default {
  // ...other options
  plugins: [
    // ...other plugins
    'msw', // [!code ++]
  ],
};
```

## Output

The MSW plugin will generate a `msw.gen.ts` file containing the following artifacts.

### Handler Factory

The `createMswHandlerFactory` function is the main export. It returns a `MswHandlerFactory` object with an `of` property containing a handler creator for each operation in your spec.

```ts
import { createMswHandlerFactory } from './client/msw.gen';

const createMock = createMswHandlerFactory({
  baseUrl: 'http://localhost:8000', // optional, inferred from spec servers
});
```

If your OpenAPI spec defines a `servers` field, the base URL will be inferred automatically. You can override it by passing `baseUrl` in the configuration.

### Handler Creators

Each operation becomes a handler creator on the `of` object. Handler creators accept either a static response object with `status` and `result` properties, or a custom MSW `HttpResponseResolver` function. All handler creators also accept an optional `options` parameter of type `RequestHandlerOptions` from MSW.

## Usage

### Static Response

The simplest way to mock an endpoint is to provide a static response object with `status` and `result` properties. Both properties are type-checked against the operation's response types.

```ts
import { setupServer } from 'msw/node';
import { createMswHandlerFactory } from './client/msw.gen';

const createMock = createMswHandlerFactory();

const mockServer = setupServer(
  // provide a static response with status code and result
  createMock.of.getPetById({ status: 200, result: { id: 1, name: 'Fido' } }),

  // type error if status or result type is incorrect
  // @ts-expect-error
  createMock.of.getPetById({ status: 200, result: 'wrong type' }),
);
```

### Custom Resolver

For more control, pass an MSW `HttpResponseResolver` function. The resolver receives typed path parameters and request body when available.

```ts
import { delay, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createMswHandlerFactory } from './client/msw.gen';

const createMock = createMswHandlerFactory();

const mockServer = setupServer(
  // custom resolver with typed params and body
  createMock.of.updatePet(async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Number(params.petId), ...body }, { status: 200 });
  }),

  // async resolver with delay
  createMock.of.getPetById(async () => {
    await delay(100);
    return HttpResponse.json({ id: 1, name: 'Fido' });
  }),
);
```

::: tip
Path parameters are typed as `string | ReadonlyArray<string>` because MSW normalizes all path parameters to strings. Use `Number()` or similar conversions if you need numeric values.
:::

### Operations Without Responses

For operations that don't define a response type, the handler creator can be invoked without arguments or with a custom resolver function.

```ts
const mockServer = setupServer(
  createMock.of.deletePet(),

  createMock.of.deletePet(() => new HttpResponse(null, { status: 204 })),
);
```

### Response Examples

When your OpenAPI spec includes response examples, the generated handlers will use them as default values. This means you can call the handler without arguments and it will return the example response automatically.

```ts
const mockServer = setupServer(
  // uses the example response from the OpenAPI spec as default
  createMock.of.getFoo(),

  // you can still override with a custom response
  createMock.of.getFoo({ status: 200, result: { name: 'Custom' } }),
);
```

By default, `valueSources` is set to `['example']`, which embeds OpenAPI examples in the generated output. To disable this, set `valueSources` to an empty array.

::: code-group

```js [config]
export default {
  // ...other options
  plugins: [
    // ...other plugins
    {
      name: 'msw',
      valueSources: [], // [!code ++]
    },
  ],
};
```

:::

### Handler Options

[Handler options](https://mswjs.io/docs/api/http#handler-options) can be provided. The object will be passed on to MSW helpers.

```ts
const mockServer = setupServer(
  createMock.of.getPetById({ status: 200, result: { id: 1, name: 'Fido' } }, { once: true }),
);
```

## Known Limitations

- Query parameters are not typed in the resolver. MSW doesn't provide typed query params natively — use `new URL(request.url).searchParams` instead.
- The response type generic is omitted from `HttpResponseResolver` to avoid MSW's `DefaultBodyType` constraint issues with union and void response types.

## API

You can view the complete list of options in the [UserConfig](https://github.com/hey-api/openapi-ts/blob/main/packages/openapi-ts/src/plugins/msw/types.ts) interface.

<!--@include: ../../partials/examples.md-->
<!--@include: ../../partials/sponsors.md-->

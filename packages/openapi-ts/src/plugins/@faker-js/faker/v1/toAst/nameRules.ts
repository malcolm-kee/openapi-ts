import { $ } from '../../../../../ts-dsl';
import type { Expression, FakerWalkerContext } from '../../shared/types';

/**
 * A data-driven rule mapping a property name to a faker method.
 * Adding new mappings requires only a new data entry — no new code.
 */
export interface NameRule {
  /**
   * Default numeric args (min/max). Schema constraints merge with these:
   * schema values override defaults. Only applicable to number/integer types.
   */
  defaultArgs?: { max?: number; min?: number };
  /** Faker method path segments, e.g., ['person', 'firstName']. */
  fakerPath: ReadonlyArray<string>;
}

/**
 * Property name context extracted from the schema visitor path.
 */
export interface PropertyNameInfo {
  name: string;
  parent?: string;
}

// ---------------------------------------------------------------------------
// String name rules (standalone).
// Keys are normalized: lowercase with separators removed, sorted alphabetically.
// ---------------------------------------------------------------------------
const STRING_NAME_RULES: Record<string, NameRule> = {
  accountnumber: { fakerPath: ['finance', 'accountNumber'] },
  address: { fakerPath: ['location', 'streetAddress'] },
  avatar: { fakerPath: ['image', 'avatar'] },
  avatarurl: { fakerPath: ['image', 'avatar'] },
  bio: { fakerPath: ['lorem', 'sentence'] },
  cardnumber: { fakerPath: ['finance', 'creditCardNumber'] },
  city: { fakerPath: ['location', 'city'] },
  color: { fakerPath: ['color', 'human'] },
  colour: { fakerPath: ['color', 'human'] },
  company: { fakerPath: ['company', 'name'] },
  companyname: { fakerPath: ['company', 'name'] },
  contenttype: { fakerPath: ['system', 'mimeType'] },
  country: { fakerPath: ['location', 'country'] },
  countrycode: { fakerPath: ['location', 'countryCode'] },
  creditcard: { fakerPath: ['finance', 'creditCardNumber'] },
  creditcardnumber: { fakerPath: ['finance', 'creditCardNumber'] },
  currency: { fakerPath: ['finance', 'currencyCode'] },
  currencycode: { fakerPath: ['finance', 'currencyCode'] },
  currencyname: { fakerPath: ['finance', 'currencyName'] },
  currencysymbol: { fakerPath: ['finance', 'currencySymbol'] },
  description: { fakerPath: ['lorem', 'sentence'] },
  domain: { fakerPath: ['internet', 'domainName'] },
  domainname: { fakerPath: ['internet', 'domainName'] },
  email: { fakerPath: ['internet', 'email'] },
  emailaddress: { fakerPath: ['internet', 'email'] },
  filename: { fakerPath: ['system', 'fileName'] },
  filepath: { fakerPath: ['system', 'filePath'] },
  firstname: { fakerPath: ['person', 'firstName'] },
  fullname: { fakerPath: ['person', 'fullName'] },
  homepage: { fakerPath: ['internet', 'url'] },
  hostname: { fakerPath: ['internet', 'domainName'] },
  iban: { fakerPath: ['finance', 'iban'] },
  id: { fakerPath: ['string', 'uuid'] },
  imageurl: { fakerPath: ['image', 'url'] },
  ip: { fakerPath: ['internet', 'ip'] },
  ipaddress: { fakerPath: ['internet', 'ip'] },
  isbn: { fakerPath: ['commerce', 'isbn'] },
  jobtitle: { fakerPath: ['person', 'jobTitle'] },
  jwt: { fakerPath: ['internet', 'jwt'] },
  lastname: { fakerPath: ['person', 'lastName'] },
  latitude: { fakerPath: ['location', 'latitude'] },
  longitude: { fakerPath: ['location', 'longitude'] },
  mac: { fakerPath: ['internet', 'mac'] },
  macaddress: { fakerPath: ['internet', 'mac'] },
  middlename: { fakerPath: ['person', 'middleName'] },
  mimetype: { fakerPath: ['system', 'mimeType'] },
  password: { fakerPath: ['internet', 'password'] },
  phone: { fakerPath: ['phone', 'number'] },
  phonenumber: { fakerPath: ['phone', 'number'] },
  postalcode: { fakerPath: ['location', 'zipCode'] },
  productname: { fakerPath: ['commerce', 'productName'] },
  profileimage: { fakerPath: ['image', 'avatar'] },
  semver: { fakerPath: ['system', 'semver'] },
  slug: { fakerPath: ['lorem', 'slug'] },
  state: { fakerPath: ['location', 'state'] },
  street: { fakerPath: ['location', 'street'] },
  streetaddress: { fakerPath: ['location', 'streetAddress'] },
  summary: { fakerPath: ['lorem', 'sentence'] },
  surname: { fakerPath: ['person', 'lastName'] },
  timezone: { fakerPath: ['location', 'timeZone'] },
  title: { fakerPath: ['lorem', 'words'] },
  token: { fakerPath: ['internet', 'jwt'] },
  url: { fakerPath: ['internet', 'url'] },
  useragent: { fakerPath: ['internet', 'userAgent'] },
  username: { fakerPath: ['internet', 'username'] },
  uuid: { fakerPath: ['string', 'uuid'] },
  version: { fakerPath: ['system', 'semver'] },
  website: { fakerPath: ['internet', 'url'] },
  zipcode: { fakerPath: ['location', 'zipCode'] },
};

// ---------------------------------------------------------------------------
// String compound rules (ancestor.property) for ambiguous names.
// Looked up before standalone rules. Keys are "normalizedParent.normalizedProp".
// ---------------------------------------------------------------------------
const STRING_COMPOUND_RULES: Record<string, NameRule> = {
  'address.city': { fakerPath: ['location', 'city'] },
  'address.country': { fakerPath: ['location', 'country'] },
  'address.state': { fakerPath: ['location', 'state'] },
  'address.street': { fakerPath: ['location', 'streetAddress'] },
  'author.name': { fakerPath: ['person', 'fullName'] },
  'book.title': { fakerPath: ['book', 'title'] },
  'company.name': { fakerPath: ['company', 'name'] },
  'customer.name': { fakerPath: ['person', 'fullName'] },
  'employee.name': { fakerPath: ['person', 'fullName'] },
  'organization.name': { fakerPath: ['company', 'name'] },
  'owner.name': { fakerPath: ['person', 'fullName'] },
  'person.name': { fakerPath: ['person', 'fullName'] },
  'product.description': { fakerPath: ['commerce', 'productDescription'] },
  'product.name': { fakerPath: ['commerce', 'productName'] },
  'user.name': { fakerPath: ['person', 'fullName'] },
};

// ---------------------------------------------------------------------------
// Integer / number name rules (standalone).
// ---------------------------------------------------------------------------
const NUMBER_NAME_RULES: Record<string, NameRule> = {
  age: { defaultArgs: { max: 120, min: 1 }, fakerPath: ['number', 'int'] },
  amount: { defaultArgs: { max: 10000, min: 0 }, fakerPath: ['number', 'float'] },
  count: { defaultArgs: { max: 1000, min: 0 }, fakerPath: ['number', 'int'] },
  port: { fakerPath: ['internet', 'port'] },
  price: { defaultArgs: { max: 10000, min: 0 }, fakerPath: ['number', 'float'] },
  quantity: { defaultArgs: { max: 100, min: 1 }, fakerPath: ['number', 'int'] },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip underscores/hyphens and lowercase for case-insensitive matching. */
function normalizeName(name: string): string {
  return name.replace(/[-_]/g, '').toLowerCase();
}

/**
 * Extract the property name and its parent context from a schema visitor path.
 *
 * Path examples:
 * - `['components', 'schemas', 'User', 'properties', 'name']`
 *    -> `{ name: 'name', parent: 'User' }`
 * - `['...', 'properties', 'address', 'properties', 'street']`
 *    -> `{ name: 'street', parent: 'address' }`
 */
export function propertyNameFromPath(
  path: ReadonlyArray<number | string>,
): PropertyNameInfo | undefined {
  for (let i = path.length - 1; i >= 1; i--) {
    if (path[i - 1] === 'properties' && typeof path[i] === 'string') {
      const name = path[i] as string;
      // The segment before the 'properties' keyword is the parent
      const parentSegment = i >= 2 ? path[i - 2] : undefined;
      const parent =
        typeof parentSegment === 'string' && parentSegment !== 'properties'
          ? parentSegment
          : undefined;
      return { name, parent };
    }
  }
  return undefined;
}

/**
 * Build a faker expression from a data-driven {@link NameRule}.
 * Optionally merges schema numeric constraints with rule defaults.
 */
function buildFromRule(
  ctx: FakerWalkerContext,
  rule: NameRule,
  schemaArgs?: { max?: number; min?: number },
): Expression {
  const chained = rule.fakerPath.reduce<Expression>(
    (acc, seg) => $(acc).attr(seg),
    ctx.fakerAccessor,
  );

  // Merge: schema constraints override rule defaults
  const merged =
    rule.defaultArgs || schemaArgs ? { ...rule.defaultArgs, ...schemaArgs } : undefined;
  if (merged && (merged.min !== undefined || merged.max !== undefined)) {
    const obj = $.object();
    if (merged.min !== undefined) {
      obj.prop('min', $.literal(merged.min));
    }
    if (merged.max !== undefined) {
      obj.prop('max', $.literal(merged.max));
    }
    return $(chained).call(obj);
  }

  return $(chained).call();
}

/** Look up compound key first, then standalone key. */
function lookupRule(
  nameInfo: PropertyNameInfo,
  standaloneMap: Record<string, NameRule>,
  compoundMap: Record<string, NameRule>,
): NameRule | undefined {
  const normalizedProp = normalizeName(nameInfo.name);

  if (nameInfo.parent) {
    const compoundKey = `${normalizeName(nameInfo.parent)}.${normalizedProp}`;
    const compoundRule = compoundMap[compoundKey];
    if (compoundRule) {
      return compoundRule;
    }
  }

  return standaloneMap[normalizedProp];
}

/**
 * Attempt to resolve a string faker expression from the property name.
 * Returns `undefined` when no rule matches.
 */
export function stringNameToExpression(
  ctx: FakerWalkerContext,
  nameInfo: PropertyNameInfo,
): Expression | undefined {
  const rule = lookupRule(nameInfo, STRING_NAME_RULES, STRING_COMPOUND_RULES);
  if (!rule) {
    return undefined;
  }
  return buildFromRule(ctx, rule);
}

/**
 * Attempt to resolve a number/integer faker expression from the property name.
 * Schema constraints (already resolved by the caller) are merged with rule defaults.
 * Returns `undefined` when no rule matches.
 */
export function numberNameToExpression(
  ctx: FakerWalkerContext,
  nameInfo: PropertyNameInfo,
  schemaArgs?: { max?: number; min?: number },
): Expression | undefined {
  const rule = lookupRule(nameInfo, NUMBER_NAME_RULES, {});
  if (!rule) {
    return undefined;
  }
  return buildFromRule(ctx, rule, schemaArgs);
}

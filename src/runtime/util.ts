type Encoders = Array<(s: string) => string>;

// Encode param names and values as URIComponent
export const encodeReserved = [encodeURIComponent, encodeURIComponent];
export const allowReserved = [encodeURIComponent, encodeURI];

/**
 * Creates a tag-function to encode template strings with the given encoders.
 */
export function encode(encoders: Encoders, delimiter = ",") {
  const q = (v: any, i: number) => {
    const encoder = encoders[i % encoders.length];
    if (typeof v === "undefined") {
      return "";
    }
    if (typeof v === "object") {
      if (Array.isArray(v)) {
        return v.map(encoder).join(delimiter);
      }
      const flat = Object.entries(v).reduce(
        (flat, entry) => [...flat, ...entry],
        [] as any,
      );
      return flat.map(encoder).join(delimiter);
    }

    return encoder(String(v));
  };

  return (strings: TemplateStringsArray, ...values: any[]) => {
    return strings.reduce((prev, s, i) => {
      return `${prev}${s}${q(values[i], i)}`;
    }, "");
  };
}

/**
 * Separate array values by the given delimiter.
 */
export function delimited(delimiter = ",") {
  return (params: Record<string, any>, encoders = encodeReserved) =>
    Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([name, value]) => encode(encoders, delimiter)`${name}=${value}`)
      .join("&");
}

/**
 * Deeply remove all properties with undefined values.
 */
export function stripUndefined<T>(obj: T) {
  return obj && JSON.parse(JSON.stringify(obj));
}

export function joinUrl(...parts: Array<string | undefined>) {
  return parts
    .filter(Boolean)
    .map((s, i) => (i === 0 ? s : s!.replace(/^\/+/, "")))
    .map((s, i, a) => (i === a.length - 1 ? s : s!.replace(/\/+$/, "")))
    .join("/");
}

/**
 * Parses a FormData object into a Record.
 */
export async function parseMultipart(formData: FormData) {
  let data: Record<string, any> = {};

  formData.forEach(async (val, key) => {
    // If the value is JSON encoded it is parsed.
    val =
      val instanceof Blob && val.type === "application/json"
        ? JSON.parse(await val.text())
        : val;

    if (key in data) {
      // If a key is repeated, we join the corresponding values into an array.
      if (Array.isArray(data[key])) {
        // If value already is array, push the new value onto it.
        data[key].push(val);
      } else {
        // Otherwise create a new array with both values.
        data[key] = [data[key], val];
      }
    } else {
      data[key] = val;
    }
  });

  return data;
}

export const GQL_API_URL = "https://api.9c.gg/graphql";
export const ARENA_TICKET_INTERVAL = 5040;
export const GQL_HEADER = {"Content-Type": "application/json"};

export const serialize = (orig, isSet = false) => {
  if (isSet) {
    return JSON.stringify([...orig]);
  } else {
    return JSON.stringify(orig);
  }
};
export const deserialize = (orig, isSet = false) => {
  let data = JSON.parse(orig);
  if (isSet) {
    return new Set(data);
  } else {
    return data;
  }
};
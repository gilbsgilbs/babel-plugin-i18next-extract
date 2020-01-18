t(
  'object',
  {
    returnObjects: true,
    defaultValue: {
      hello: 'world',
      value: 42,
      itsnull: null,
      nested: {
        obj: {},
        arr: [],
      },
    },
  },
);

t(
  'array',
  {
    returnObjects: true,
    defaultValue: ['pasta', {hello: 'world'}, 42, null, ['nested']],
  },
);

t(
  'number',
  {
    returnObjects: true,
    defaultValue: 42,
  },
);
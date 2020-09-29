module.exports = {
  "inputFiles": ["severalDomain.js"],
  "description": "test that outputPath option as a function can return different path according to the given locale & namespace",
  "pluginOptions": {
    outputPath: (locale, namespace) => {
      switch(namespace) {
        case 'translation':
          return `${__dirname}/.extracted/outputPath/custom/abc/${locale}/${namespace}.json`
        case 'common':
          return `${__dirname}/.extracted/outputPath/another/efg/${locale}/${namespace}.json`
        default:
      }
    }
  },
  "expectValues": [
    [
      {
        "anotherkey0": "",
      },
      {
        "ns": "translation"
      }
    ],
    [
      {
        "key0": "",
      },
      {
        "ns": "common"
      }
    ]
  ]
}

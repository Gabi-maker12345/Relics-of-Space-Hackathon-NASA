// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Pages and single-purpose components use short, descriptive names.
    'vue/multi-word-component-names': 'off',
  },
})

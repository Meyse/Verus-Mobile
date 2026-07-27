# Typography Contract

Use the shared roles in `src/theme/onboarding/tokens.js` for new or intentionally
redesigned typography. The theme name is historical; these tokens are also the
current source of truth for touched signed-in flows.

## Shared title roles

- `headlineLg`: major onboarding and flow headlines.
- `headlineMd`: primary screen, wizard, and success titles.
- `headlineCompact`: compact-device headline variant.
- `titleSheet`: prominent sheet titles.
- `AppButton`: shared action-label weight and tracking.

Apply the typography token before local layout and semantic-color overrides:

```js
style={[
  theme.typography.headlineMd,
  styles.titleLayout,
  {color: theme.colors.textPrimary},
]}
```

Do not restate a token's `fontSize`, `lineHeight`, `fontWeight` or `fontFamily`,
and `letterSpacing` in a local title style. Title roles use 600 weight. Reserve
700 weight for deliberate data, amount, count, status, or compact action
emphasis.

Legacy screens can keep their existing typography until they are intentionally
migrated. When a redesigned title is touched, prefer moving it onto the nearest
shared role instead of adding another local combination.

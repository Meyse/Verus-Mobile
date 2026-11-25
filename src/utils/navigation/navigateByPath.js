/*
  2026-11-25: Added for the React Navigation 7 upgrade.

  React Navigation 6 searched child navigators for a route name. When a screen
  called navigate('Notifications') and no parent navigator had that route, v6
  found it in a mounted child stack (for example a Home tab stack), went to it,
  and moved the focus there. React Navigation 7 does not search child
  navigators. The same call does nothing in a release build.

  navigateByPath() restores the v6 result with an explicit nested navigate.
  The caller gives the full route path, from the outer navigator to the screen.
  The function finds the deepest route on the path that this navigator or an
  ancestor owns, and navigates through the rest of the path from there.
  Each level uses pop: true. Thus an existing route is reused and the routes
  above it are closed, as v6 did.
*/

const HOME_TAB_ROUTES = ['WalletHome', 'ServicesHome'];

const getNavigators = navigation => {
  const navigators = [];
  let current = navigation;

  while (current) {
    navigators.push(current);
    current = typeof current.getParent === 'function' ? current.getParent() : undefined;
  }

  return navigators;
};

const getStateOf = navigator => {
  try {
    return typeof navigator.getState === 'function' ? navigator.getState() : undefined;
  } catch (e) {
    return undefined;
  }
};

const findHomeTabsState = state => {
  if (!state || !Array.isArray(state.routes)) return undefined;
  if (Array.isArray(state.routeNames) && state.routeNames.includes('WalletHome')) return state;

  for (const route of state.routes) {
    const found = findHomeTabsState(route.state);
    if (found) return found;
  }

  return undefined;
};

/**
 * Returns the Home tab that shows a screen that both the Wallet and the
 * Services tab stacks contain (for example Notifications or Service).
 * It is the focused tab if that tab is WalletHome or ServicesHome.
 * Otherwise it is WalletHome, the initial tab.
 */
export const getHomeTabFor = navigation => {
  const navigators = getNavigators(navigation);
  let tabsState;

  for (const navigator of navigators) {
    const state = getStateOf(navigator);
    if (state?.routeNames?.includes('WalletHome')) {
      tabsState = state;
      break;
    }
  }

  if (!tabsState) tabsState = findHomeTabsState(getStateOf(navigators[navigators.length - 1]));

  const focused = tabsState?.routes?.[tabsState.index]?.name;
  return HOME_TAB_ROUTES.includes(focused) ? focused : 'WalletHome';
};

/**
 * Navigates to the last route of `path`.
 * @param {object} navigation The navigation object of the calling screen.
 * @param {string[]} path The route names from an outer navigator to the screen.
 * @param {object} [params] The params of the last route.
 */
export const navigateByPath = (navigation, path, params) => {
  const navigators = getNavigators(navigation);

  for (let i = path.length - 1; i >= 0; i--) {
    const owner = navigators.find(navigator =>
      getStateOf(navigator)?.routeNames?.includes(path[i]),
    );

    if (owner) {
      let nestedParams = params;
      for (let j = path.length - 1; j > i; j--) {
        nestedParams = {screen: path[j], params: nestedParams, pop: true};
      }

      return navigation.navigate(path[i], nestedParams, {pop: true});
    }
  }

  // No navigator on the path is mounted (or the navigation object has no
  // state, as in unit tests). Keep the original call.
  return navigation.navigate(path[path.length - 1], params);
};

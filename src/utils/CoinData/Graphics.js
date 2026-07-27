import React from "react";
import { Card } from "react-native-paper";
import { View } from "react-native";
import { useOnboardingTheme } from "../../theme/onboarding";
import { getCoinLogo } from "./CoinData";
import { CoinDirectory } from "./CoinDirectory";
import { coinsList } from "./CoinsList";

export const RenderSquareLogo = (LogoComponent, color, width = 40, height = 40) => {
  return (
    <Card
      style={{
        backgroundColor: color,
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row"
      }}
      elevation={0}
    >
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        {LogoComponent}
      </View>
    </Card>
  );
};

export const RenderCircleLogo = (LogoComponent, color, width = 40, height = 40) => {
  return (
    <Card
      style={{
        backgroundColor: color,
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        borderRadius: width
      }}
      elevation={0}
    >
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        {LogoComponent}
      </View>
    </Card>
  );
};

export const getSimpleLogo = (chainTicker, theme = 'light') => {
  let proto;
  let color;

  try {
    const coinObj = CoinDirectory.findCoinObj(chainTicker)
    color = coinObj.theme_color;
    proto = coinObj.proto;
  } catch(e) {
    proto = 'vrsc';
    color = coinsList.VRSC.theme_color;
  }
  
  const Logo = getCoinLogo(chainTicker, proto, theme);

  return { Logo: Logo, color };
}

/**
 * @deprecated Legacy background-backed renderer. Do not use in redesigned UI.
 */
export const RenderSquareCoinLogo = (chainTicker, style = {}, width = 40, height = 40) => {
  const { Logo, color } = getSimpleLogo(chainTicker);

  return RenderSquareLogo(
    <Logo
      width={width - 16}
      height={height - 16}
      style={{
        alignSelf: "center",
        ...style
      }}
    />,
    color,
    width,
    height
  );
};

const getAssetBadgeTicker = coinObj => {
  if (Object.prototype.hasOwnProperty.call(coinObj, 'icon_badge')) {
    return coinObj.icon_badge;
  }

  if (coinObj.proto === 'erc20') return 'ETH';

  const currencyId = coinObj.currency_id || coinObj.id;
  if (
    coinObj.proto === 'vrsc' &&
    coinObj.mapped_to != null &&
    currencyId != null &&
    coinObj.system_id != null &&
    currencyId !== coinObj.system_id
  ) {
    return 'VRSC';
  }

  return null;
};

export const AssetCoinLogo = ({
  coinId,
  showBadge = true,
  size = 40,
  style = {},
}) => {
  const theme = useOnboardingTheme();
  const {Logo} = getSimpleLogo(coinId, 'dark');
  let BadgeLogo = null;

  if (showBadge) {
    try {
      const coinObj = CoinDirectory.findCoinObj(coinId);
      const badgeTicker = getAssetBadgeTicker(coinObj);
      BadgeLogo = badgeTicker
        ? getSimpleLogo(badgeTicker, 'dark').Logo
        : null;
    } catch (e) {
      BadgeLogo = null;
    }
  }

  const badgeSize = size * 0.55;
  const overflowOffset = badgeSize * 0.3;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          overflow: 'visible',
          zIndex: 1,
        },
        style,
      ]}>
      <Logo width={size} height={size} />
      {BadgeLogo ? (
        <View
          style={{
            position: 'absolute',
            right: -overflowOffset,
            bottom: -overflowOffset,
            width: badgeSize,
            height: badgeSize,
            padding: 2,
            borderRadius: badgeSize / 2,
            backgroundColor: theme.colors.background,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
          }}>
          <BadgeLogo width={badgeSize - 4} height={badgeSize - 4} />
        </View>
      ) : null}
    </View>
  );
};

/**
 * @deprecated Legacy background-backed renderer. Do not use in redesigned UI.
 */
export const RenderCircleCoinLogo = (chainTicker, style = {}, width = 40, height = 40) => {
  const { Logo, color } = getSimpleLogo(chainTicker);

  return RenderCircleLogo(
    <Logo
      width={width - 16}
      height={height - 16}
      style={{
        alignSelf: "center",
        ...style
      }}
    />,
    color,
    width,
    height
  );
};

export const RenderPlainCoinLogo = (chainTicker, style = {}, width = 40, height = 40) => {
  const { Logo } = getSimpleLogo(chainTicker, 'dark');

  return <Logo
    width={width}
    height={height}
    style={{
      alignSelf: "center",
      ...style
    }}
  />
};

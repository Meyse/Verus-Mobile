import React from "react";
import { Card } from "react-native-paper";
import { View } from "react-native";
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

export const RenderAssetListCoinLogo = (
  chainTicker,
  style = {},
  width = 40,
  height = 40,
) => {
  const {Logo} = getSimpleLogo(chainTicker, 'dark');
  let BadgeLogo = null;

  try {
    const coinObj = CoinDirectory.findCoinObj(chainTicker);
    const displayTicker = coinObj.display_ticker || '';
    const displayName = coinObj.display_name || '';

    if (
      (displayTicker.includes('.vETH') || displayName.includes('on Verus')) &&
      !displayTicker.includes('Bridge.vETH')
    ) {
      BadgeLogo = getSimpleLogo('VRSC', 'dark').Logo;
    } else if (displayName.includes('on Ethereum')) {
      BadgeLogo = getSimpleLogo('ETH', 'dark').Logo;
    }
  } catch (e) {
    BadgeLogo = null;
  }

  const badgeSize = width * 0.55;
  const overflowOffset = badgeSize * 0.3;

  return (
    <View
      style={{
        width,
        height,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        overflow: 'visible',
        zIndex: 1,
      }}>
      <Logo width={width} height={height} style={style} />
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
            backgroundColor: 'white',
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

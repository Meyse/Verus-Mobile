import React, {useState} from 'react';
import {Text, useWindowDimensions, View} from 'react-native';
import Svg, {Line, Path} from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import StatusBadge from '../../components/StatusBadge';
import {VerusPayTextLogo} from '../../images/customIcons';
import {paymentRequestSlipStyles as styles} from '../../styles';
import {PAYMENT_REQUEST_PAPER as paper} from '../../styles/components/paymentRequestSlip.styles';
import {AssetCoinLogo} from '../../utils/CoinData/Graphics';

const PaymentRequestSlip = ({isSmall, qrRef, snapshot}) => {
  const {height: windowHeight} = useWindowDimensions();
  const compact = isSmall || windowHeight <= 667;
  const showVerusIcon = snapshot.conversion && snapshot.showVerusIcon;
  const [size, setSize] = useState({width: 0, height: 0});
  const [perforation, setPerforation] = useState(0);
  const {width: w, height: h} = size;
  const p = perforation;
  // Two true half-round cut-outs, rather than circles painted over the paper.
  const outline = `M22 0H${w - 22}Q${w} 0 ${w} 22V${p - 11}A11 11 0 0 0 ${w} ${p + 11}V${h - 22}Q${w} ${h} ${w - 22} ${h}H22Q0 ${h} 0 ${h - 22}V${p + 11}A11 11 0 0 0 0 ${p - 11}V22Q0 0 22 0Z`;

  return (
    <View
      onLayout={event => setSize(event.nativeEvent.layout)}
      style={styles.frame}>
      {w > 0 && h > 0 && p > 0 ? (
        <Svg
          accessible={false}
          height={h}
          pointerEvents="none"
          style={styles.outline}
          width={w}>
          <Path
            d={outline}
            fill={paper.background}
            stroke={paper.outline}
            strokeWidth={1}
          />
          <Line
            x1={25}
            x2={w - 25}
            y1={p}
            y2={p}
            stroke={paper.perforation}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeDasharray="1 6"
          />
        </Svg>
      ) : null}
      <View
        onLayout={event => setPerforation(event.nativeEvent.layout.height)}
        style={[styles.face, compact && styles.faceCompact]}>
        <View style={styles.top}>
          {snapshot.conversion ? (
            <>
              <VerusPayTextLogo
                accessibilityLabel="VerusPay"
                height={20}
                width={103}
              />
              <StatusBadge
                label={snapshot.allowConversion ? 'Conversions allowed' : 'No conversions'}
                tone={snapshot.allowConversion ? 'success' : 'neutral'}
                variant="paper"
              />
            </>
          ) : (
            <View style={styles.asset}>
              <AssetCoinLogo coinId={snapshot.coinId} size={20} />
              <Text style={styles.assetName}>{snapshot.assetName}</Text>
            </View>
          )}
        </View>
        <View style={styles.amountRow}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.25}
            numberOfLines={1}
            style={[styles.amount, compact && styles.amountCompact]}>
            {snapshot.displayAmount ?? snapshot.amountText}
          </Text>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.unit}>
            {snapshot.displayUnit ?? snapshot.currency}
          </Text>
        </View>
        {snapshot.fiatEstimate ? (
          <Text style={styles.estimate}>{snapshot.fiatEstimate}</Text>
        ) : null}
        {snapshot.subject ? <Text style={styles.note}>{snapshot.subject}</Text> : null}
      </View>
      <View style={styles.stub}>
        <View style={styles.qrTile}>
          <QRCode
            getRef={ref => { qrRef.current = ref; }}
            logo={showVerusIcon ? require('../../images/customIcons/Verus.png') : undefined}
            logoBackgroundColor={paper.qrBackground}
            logoBorderRadius={80}
            logoSize={showVerusIcon ? 48 : undefined}
            size={compact ? 160 : 200}
            value={snapshot.qrString}
          />
        </View>
        <Text
          ellipsizeMode="middle"
          numberOfLines={1}
          style={[styles.address, !snapshot.identityName && styles.identifier]}>
          {snapshot.identityName || snapshot.address}
        </Text>
      </View>
    </View>
  );
};

export default PaymentRequestSlip;

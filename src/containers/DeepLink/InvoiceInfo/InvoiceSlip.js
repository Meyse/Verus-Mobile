import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Svg, {Line, Path} from 'react-native-svg';
import StatusBadge from '../../../components/StatusBadge';
import {fontStyle} from '../../../globals/fonts';
import {VerusPayTextLogo} from '../../../images/customIcons';
import {paymentRequestSlipStyles as styles} from '../../../styles';
import {PAYMENT_REQUEST_PAPER as paper} from '../../../styles/components/paymentRequestSlip.styles';

const STUB_HEIGHT = 50;

// The payer's side of a VerusPay invoice: the same paper slip that "Request
// ready" shows to the requester (owner choice, 2026-10-21), without the QR.
// The badge says whether a VerusID signed it; the stub names the requester,
// or the destination when nobody signed.
const InvoiceSlip = ({amount, unit, fiat, signer, destination}) => {
  const [size, setSize] = useState({width: 0, height: 0});
  const [perforation, setPerforation] = useState(0);
  const {width: w, height: h} = size;
  const p = perforation;
  const outline = `M22 0H${w - 22}Q${w} 0 ${w} 22V${p - 11}A11 11 0 0 0 ${w} ${p + 11}V${h - 22}Q${w} ${h} ${w - 22} ${h}H22Q0 ${h} 0 ${h - 22}V${p + 11}A11 11 0 0 0 0 ${p - 11}V22Q0 0 22 0Z`;

  return (
    <View
      accessible
      accessibilityLabel={`Invoice for ${amount} ${unit}${
        signer ? `, requested by ${signer}` : ', not signed'
      }`}
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
        style={styles.face}>
        <View style={styles.top}>
          <VerusPayTextLogo
            accessibilityLabel="VerusPay"
            height={20}
            width={103}
          />
          <StatusBadge
            label={signer ? 'Signed' : 'Unsigned'}
            tone={signer ? 'success' : 'neutral'}
            variant="paper"
          />
        </View>
        <View style={styles.amountRow}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.4}
            numberOfLines={1}
            style={styles.amount}>
            {amount}
          </Text>
          <Text numberOfLines={1} style={styles.unit}>
            {unit}
          </Text>
        </View>
        {fiat ? <Text style={styles.estimate}>≈ {fiat}</Text> : null}
      </View>
      <View style={localStyles.stub}>
        <Text style={localStyles.stubLabel}>{signer ? 'Requested by' : 'To'}</Text>
        <Text
          ellipsizeMode="middle"
          numberOfLines={1}
          style={[
            localStyles.stubValue,
            !signer && localStyles.stubIdentifier,
            !signer && styles.identifier,
          ]}>
          {signer || destination}
        </Text>
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  stub: {
    height: STUB_HEIGHT,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stubLabel: {
    color: paper.secondary,
    fontSize: 14,
    lineHeight: 20,
    marginRight: 12,
    ...fontStyle('regular'),
  },
  stubValue: {
    flexShrink: 1,
    color: paper.primary,
    fontSize: 14,
    lineHeight: 20,
    ...fontStyle('semiBold'),
  },
  stubIdentifier: {fontSize: 13, ...fontStyle('regular')},
});

export default InvoiceSlip;

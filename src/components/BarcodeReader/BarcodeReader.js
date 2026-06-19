import React, {useState, useEffect, useRef} from 'react';
import {View, ScrollView, AppState, Platform, StyleSheet} from 'react-native';
import {Text, Button} from 'react-native-paper';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import Colors from '../../globals/colors';
import styles from '../../styles';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {verifyPermissions} from '../../utils/permissions';
import {openSettings, RESULTS, PERMISSIONS, request} from 'react-native-permissions';
import BarcodeMask from 'react-native-barcode-mask';
import AnimatedActivityIndicator from '../AnimatedActivityIndicator';
import {triggerHapticSuccess} from '../../utils/haptics/haptics';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {fontStyle} from '../../globals/fonts';

const BarcodeReader = props => {
  const cameraProps = props.cameraProps == null ? {} : props.cameraProps;
  const maskProps = props.maskProps == null ? {} : props.maskProps;
  const appState = useRef(AppState.currentState);
  const insets = useSafeAreaInsets();

  const componentIsMounted = useRef(true);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  const [needToGoToSettings, setNeedToGoToSettings] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [loading, setLoading] = useState(false);
  const device = useCameraDevice('back')
  
  const {
    prompt,
    button,
    onScan,
    cameraOn,
    promptPlacement,
    promptContainerStyle,
    promptTextStyle,
    buttonContainerStyle,
    safeBottomButton,
  } = props;
  const cameraOff = cameraOn != null && !cameraOn;
  const promptText = prompt ? prompt : 'Scan a QR code';
  const promptAtTop = promptPlacement === 'top';
  const buttonContainerStyles = safeBottomButton
    ? [
        barcodeReaderStyles.safeButtonContainer,
        {
          paddingLeft: 32 + insets.left,
          paddingRight: 32 + insets.right,
          paddingBottom: Math.max(insets.bottom + 12, 36),
        },
      ]
    : barcodeReaderStyles.buttonContainer;

  const maskHeight =
    props.maskProps == null || props.maskProps.height == null
      ? 240
      : props.maskProps.height;
  const maskWidth =
    props.maskProps == null || props.maskProps.width == null
      ? 240
      : props.maskProps.width;
  
  const codeScanner = useCodeScanner({
    codeTypes: ["qr"],
    onCodeScanned: async (codes) => {
      triggerHapticSuccess();
      setLoading(true);
  
      if (onScan != null) {
        await onScan(codes);
      }
  
      if (componentIsMounted.current) {
        setLoading(false);
      }
    }
  })

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      appState.current = nextAppState;
      setAppStateVisible(appState.current);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const onMount = async () => {
    const permissionStatus = await verifyPermissions(
      PERMISSIONS.IOS.CAMERA,
      PERMISSIONS.ANDROID.CAMERA,
    );
  
    if (permissionStatus.canUse) {
      setHasCameraPermission(true);
    } else if (permissionStatus.reason === RESULTS.BLOCKED) {
      setNeedToGoToSettings(true);
    } else {
      // Request permission and update state
      const requestResult = await request(
        Platform.OS === "ios" ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA
      );
      if (requestResult === RESULTS.GRANTED) {
        setHasCameraPermission(true);
      } else if (requestResult === RESULTS.BLOCKED) {
        setNeedToGoToSettings(true);
      }
    }
  };

  useEffect(() => {
    onMount();
  }, []);

  return cameraOff || loading ? (
    <View style={styles.focalCenter}>
      <AnimatedActivityIndicator
        style={{
          width: 128,
        }}
      />
    </View>
  ) : hasCameraPermission && device != null ? (
      <>
        <Camera
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            alignItems: 'center',
            flexDirection: 'column',
          }}
          device={device}
          codeScanner={codeScanner}
          isActive={appStateVisible === 'active' && !props.cameraDisabled}
          {...cameraProps} 
        />
        <View style={barcodeReaderStyles.maskOverlay}>
          <BarcodeMask
            showAnimatedLine={false}
            height={maskHeight}
            width={maskWidth}
            {...maskProps}
          />
          {!promptAtTop && (
            <Text style={[barcodeReaderStyles.promptText, promptTextStyle]}>
              {promptText}
            </Text>
          )}
        </View>
        {promptAtTop && (
          <View
            style={[
              barcodeReaderStyles.topPromptContainer,
              {
                paddingTop: Math.max(insets.top + 12, 40),
                paddingLeft: 24 + insets.left,
                paddingRight: 24 + insets.right,
              },
              promptContainerStyle,
            ]}>
            <Text style={[barcodeReaderStyles.topPromptText, promptTextStyle]}>
              {promptText}
            </Text>
          </View>
        )}
        {button ? (
          <View style={[buttonContainerStyles, buttonContainerStyle]}>
            {button()}
          </View>
        ) : null}
      </>
  ) : (
    <ScrollView
      style={styles.flexBackground}
      contentContainerStyle={{...styles.centerContainer, backgroundColor: Colors.primaryColor}}>
      <MaterialCommunityIcons
        name={'camera-off'}
        color={Colors.secondaryColor}
        size={104}
      />
      <Text
        style={{
          ...styles.centeredText,
          ...styles.standardWidthCenterBlock,
          color: Colors.secondaryColor,
          fontSize: 20,
        }}>
        {device == null ? 'No camera hardware detected' : 'Allow Verus Mobile to use your camera to scan QR codes.'}
      </Text>
      {device != null && 
        (<Button onPress={openSettings} textColor={Colors.secondaryColor} style={{ marginBottom: 8 }}>
          {needToGoToSettings ? 'Configure in settings' : 'Allow'}
        </Button>)
      }
      {button ? button() : null}
    </ScrollView>
  );
};

export default BarcodeReader;

const barcodeReaderStyles = StyleSheet.create({
  maskOverlay: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 0,
    paddingBottom: 32,
    width: '100%',
    height: '100%',
  },
  promptText: {
    fontSize: 20,
    color: Colors.secondaryColor,
    marginTop: 24,
    textAlign: 'center',
  },
  topPromptContainer: {
    position: 'absolute',
    top: 0,
    width: '100%',
    alignItems: 'center',
  },
  topPromptText: {
    fontSize: 24,
    lineHeight: 30,
    color: Colors.secondaryColor,
    textAlign: 'center',
    ...fontStyle('semiBold'),
  },
  buttonContainer: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 0,
    paddingBottom: 8,
  },
  safeButtonContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
});

import React from 'react';
import {StyleSheet, View} from 'react-native';
import Video from 'react-native-video';
import Colors from '../globals/colors';

const welcomeWavesBackground = require('../../assets/videos/verus-waves-blur-slower-smooth.mp4');

const WelcomeBackgroundVideo = () => (
  <View pointerEvents="none" style={styles.container}>
    <Video
      source={welcomeWavesBackground}
      style={StyleSheet.absoluteFill}
      resizeMode="cover"
      repeat
      muted
      paused={false}
      playInBackground={false}
      playWhenInactive={false}
      ignoreSilentSwitch="obey"
      disableFocus
    />
    <View style={styles.veil} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.secondaryColor,
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
  },
});

export default WelcomeBackgroundVideo;

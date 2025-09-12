/**
 * Update: Redesign SeedWords to show 12 words per screen with card styling.
 */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import SoftSpotlightBackground from '../../../../../components/SoftSpotlightBackground';
import useResponsive from '../../../../../hooks/useResponsive';
import { AppButton, AppTextField } from '../../../../../components/ui';

export default function SeedWords({navigation, newSeed, onComplete}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [showVerification, setShowVerification] = useState(false);
  const [randomIndices, setRandomIndices] = useState([]);
  const [wordGuesses, setWordGuesses] = useState(['', '', '']);
  const [touched, setTouched] = useState(false);
  
  if (!newSeed) {
    return (
      <SafeAreaView className="flex-1">
        <SoftSpotlightBackground pointerEvents="none" className="absolute left-0 right-0 top-0 bottom-0" />
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-zinc-600">Preparing your seed…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const seedWords = newSeed.split(' ');
  
  const wordsPerPage = 12;
  const totalPages = Math.ceil(seedWords.length / wordsPerPage);
  const isLastPage = currentPage >= totalPages - 1;
  
  const displayWords = seedWords.slice(
    currentPage * wordsPerPage, 
    (currentPage + 1) * wordsPerPage
  );

  const { isVerySmallHeight, isSmallHeight, height: screenHeight } = useResponsive();
  const titleSizeClass = isVerySmallHeight ? 'text-2xl' : isSmallHeight ? 'text-3xl' : 'text-4xl';
  const subtitleLineHeight = isSmallHeight || isVerySmallHeight ? 20 : 22;
  const topPadding = isSmallHeight ? 12 : 40;

  const generateRandomIndices = () => {
    const indices = [];
    while (indices.length < 3) {
      const rand = Math.floor(Math.random() * seedWords.length);
      if (!indices.includes(rand)) {
        indices.push(rand);
      }
    }
    return indices.sort((a, b) => a - b);
  };

  useEffect(() => {
    if (showVerification && randomIndices.length === 0) {
      const indices = generateRandomIndices();
      setRandomIndices(indices);
    }
  }, [showVerification]);

  const nextPage = () => {
    if (isLastPage) {
      setShowVerification(true);
    } else {
      setCurrentPage(currentPage + 1);
    }
  };

  const getPageTitle = () => {
    if (showVerification) return 'Verify your recovery phrase';
    const start = currentPage * wordsPerPage + 1;
    const end = Math.min((currentPage + 1) * wordsPerPage, seedWords.length);
    return `Your ${start}-${end} word recovery phrase`;
  };

  const getNextButtonLabel = () => {
    if (isLastPage) return 'Next';
    const start = (currentPage + 1) * wordsPerPage + 1;
    const end = Math.min((currentPage + 2) * wordsPerPage, seedWords.length);
    return `Show words ${start}-${end}`;
  };

  const getErrorText = (index) => {
    if (!touched) return '';
    const guess = wordGuesses[index].trim().toLowerCase();
    const actual = seedWords[randomIndices[index]].toLowerCase();
    if (!guess) return 'Please enter the word.';
    if (guess !== actual) return 'Incorrect word.';
    return '';
  };

  const verify = () => {
    setTouched(true);
    const hasErrors = randomIndices.some((_, index) => getErrorText(index));
    if (!hasErrors) {
      // Navigate to inline setup screen instead of modal flow
      navigation.navigate('SetupWallet');
    }
  };

  console.log('Render - showVerification:', showVerification, 'randomIndices:', randomIndices);

  return (
    <SafeAreaView className="flex-1">
      <SoftSpotlightBackground pointerEvents="none" className="absolute left-0 right-0 top-0 bottom-0" />
      
      {isVerySmallHeight ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingTop: topPadding }} className="flex-1 px-5 pb-4">
          {/* Content */}
          <View>
            <View>
              <Text className={'text-zinc-800 font-bold ' + titleSizeClass}>
                {getPageTitle()}
              </Text>
              <Text className="text-zinc-600 mt-2" style={{ lineHeight: subtitleLineHeight }}>
                {showVerification ? 'Enter the requested words to verify you wrote them down correctly' : 'Keep this offline and never share it with anyone'}
              </Text>
            </View>
            
            {/* Words Grid or Verification */}
            <View className="mt-8" key={showVerification ? 'verification' : 'words'}>
              {showVerification ? (
                <View>
                  {randomIndices.length === 0 ? (
                    <Text className="text-zinc-600">Preparing verification…</Text>
                  ) : (
                    randomIndices.map((wordIndex, index) => (
                      <View key={`verify-${index}`} className="mb-4">
                        <Text className="text-sm text-zinc-700 mb-2">
                          {`Enter word ${wordIndex + 1}:`}
                        </Text>
                        <AppTextField
                          placeholder={`Word ${wordIndex + 1}`}
                          value={wordGuesses[index]}
                          onChangeText={(text) => {
                            const newGuesses = [...wordGuesses];
                            newGuesses[index] = text;
                            setWordGuesses(newGuesses);
                          }}
                          autoCapitalize="none"
                          autoCorrect={false}
                          returnKeyType={index === 2 ? "done" : "next"}
                          errorText={getErrorText(index)}
                          onBlur={() => setTouched(true)}
                        />
                      </View>
                    ))
                  )}
                </View>
              ) : (
                <View className="flex-row flex-wrap justify-between">
                  {displayWords.map((word, index) => (
                    <View key={`word-${currentPage}-${index}`} className="w-[30%] mb-4 bg-white/60 border border-white/40 rounded-xl p-3 items-center">
                      <Text className="text-xs text-zinc-500 mb-1">
                        {currentPage * wordsPerPage + index + 1}
                      </Text>
                      <Text className="text-base font-semibold text-zinc-800">
                        {word}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
          
          {/* Bottom text and CTA */}
          <View>
            {!showVerification ? (
              <Text className="text-center text-xs text-zinc-600 mb-4">
                {"Once you've written down the words you can go to the next words"}
              </Text>
            ) : null}
            <AppButton onPress={showVerification ? verify : nextPage} disabled={showVerification && wordGuesses.some(guess => !guess.trim())}>
              {showVerification ? 'Complete' : getNextButtonLabel()}
            </AppButton>
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 px-5 pb-6 justify-between" style={{ paddingTop: topPadding }}>
          {/* Content */}
          <View>
            <View>
              <Text className={'text-zinc-800 font-bold ' + titleSizeClass}>
                {getPageTitle()}
              </Text>
              <Text className="text-zinc-600 mt-2" style={{ lineHeight: subtitleLineHeight }}>
                {showVerification ? 'Enter the requested words to verify you wrote them down correctly' : 'Keep this offline and never share it with anyone'}
              </Text>
            </View>
            
            {/* Words Grid or Verification */}
            <View className="mt-10" key={showVerification ? 'verification' : 'words'}>
              {showVerification ? (
                <View>
                  {randomIndices.length === 0 ? (
                    <Text className="text-zinc-600">Preparing verification…</Text>
                  ) : (
                    randomIndices.map((wordIndex, index) => (
                      <View key={`verify-${index}`} className="mb-4">
                        <Text className="text-sm text-zinc-700 mb-2">
                          {`Enter word ${wordIndex + 1}:`}
                        </Text>
                        <AppTextField
                          placeholder={`Word ${wordIndex + 1}`}
                          value={wordGuesses[index]}
                          onChangeText={(text) => {
                            const newGuesses = [...wordGuesses];
                            newGuesses[index] = text;
                            setWordGuesses(newGuesses);
                          }}
                          autoCapitalize="none"
                          autoCorrect={false}
                          returnKeyType={index === 2 ? "done" : "next"}
                          errorText={getErrorText(index)}
                          onBlur={() => setTouched(true)}
                        />
                      </View>
                    ))
                  )}
                </View>
              ) : (
                <View className="flex-row flex-wrap justify-between">
                  {displayWords.map((word, index) => (
                    <View key={`word-${currentPage}-${index}`} className="w-[30%] mb-4 bg-white/60 border border-white/40 rounded-xl p-3 items-center">
                      <Text className="text-xs text-zinc-500 mb-1">
                        {currentPage * wordsPerPage + index + 1}
                      </Text>
                      <Text className="text-base font-semibold text-zinc-800">
                        {word}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
          
          {/* Bottom text and CTA */}
          <View>
            {!showVerification ? (
              <Text className="text-center text-xs text-zinc-600 mb-4">
                {"Once you've written down the words you can go to the next words"}
              </Text>
            ) : null}
            <AppButton onPress={showVerification ? verify : nextPage} disabled={showVerification && wordGuesses.some(guess => !guess.trim())}>
              {showVerification ? 'Complete' : getNextButtonLabel()}
            </AppButton>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
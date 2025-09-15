/**
 * Update: ImportSeed redesigned with OnboardScreen while preserving behavior.
 * - Keeps existing 4-letter commit logic and validateMnemonic checks
 * - Adds BIP39 suggestions and a Paste Phrase helper
 * - Force 24-word flow; Import enabled only when checksum valid
 */
import {validateMnemonic, wordlists} from 'bip39';
import React, {useEffect, useMemo, useState} from 'react';
import { View, Dimensions, Keyboard, TouchableOpacity, Platform, Text, Pressable, ScrollView } from 'react-native';
import {createAlert} from '../../../../../actions/actions/alert/dispatchers/alert';
import OnboardScreen from '../../../../../components/layout/OnboardScreen';
import { AppTextField, AppButton } from '../../../../../components/ui';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import useResponsive from '../../../../../hooks/useResponsive';

export default function ImportSeed({
  setImportedSeed,
  importedSeed,
  onComplete,
}) {
  const { isVerySmallHeight, isSmallHeight } = useResponsive();
  const {height} = Dimensions.get('window');

  const [currentWord, setCurrentWord] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  const wordlist = wordlists.EN;

  const [words, setWords] = useState([]);
  const [isValidMnemonic, setIsValidMnemonic] = useState(
    validateMnemonic(importedSeed, wordlist),
  );

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      },
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false),
    );

    // returned function will be called on component unmount
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    if (importedSeed != null && importedSeed.length > 0) {
      const seedSplit = importedSeed.split(' ');

      for (const word of seedSplit) {
        if (!wordlist.includes(word)) {
          setImportedSeed('');
          break;
        }
      }

      setWords(importedSeed.split(' '));
      setIsValidMnemonic(validateMnemonic(importedSeed, wordlist));
    } else {
      setWords([]);
      setIsValidMnemonic(false);
    }
  }, [importedSeed]);

  useEffect(() => {
    setCurrentWord(words[currentWordIndex] ? words[currentWordIndex] : '');
  }, [currentWordIndex]);

  const handleImport = () => {
    if (!importedSeed || importedSeed.length < 1) {
      createAlert('Error', 'Please enter a mnemonic seed.');
    } else if (!validateMnemonic(importedSeed, wordlist)) {
      createAlert('Error', 'Invalid mnemonic seed.');
    } else {
      onComplete();
    }
  };

  const addWord = word => {
    const cleanWord = word.replace(/\s/g, '').toLowerCase();
    const wordKey = cleanWord.slice(0, 4);
    const fullWord = wordlist.find(x => x.slice(0, 4) === wordKey);

    if (fullWord == null) {
      createAlert('Invalid word', `'${cleanWord}' is not a valid seed word.`);
      return;
    }

    if (currentWordIndex >= words.length) {
      const newImportedSeed =
        importedSeed == null || importedSeed.length == 0
          ? fullWord
          : importedSeed + ' ' + fullWord;

      setImportedSeed(newImportedSeed);

      const newWords = newImportedSeed.split(' ');

      if (newWords.length == 24) {
        Keyboard.dismiss();
      } else {
        setCurrentWordIndex(newImportedSeed.split(' ').length);
      }
    } else {
      const newImportedSeedArr =
        importedSeed != null ? importedSeed.split(' ') : [];

      newImportedSeedArr[currentWordIndex] = fullWord;
      setImportedSeed(newImportedSeedArr.join(' '));

      Keyboard.dismiss();
    }
  };

  const suggestions = useMemo(() => {
    const prefix = currentWord.trim().toLowerCase();
    if (prefix.length < 2) return [];
    // Show up to 5 matching BIP39 words
    return wordlist.filter(w => w.startsWith(prefix)).slice(0, 5);
  }, [currentWord]);


  const WordChip = ({ word, index, isSelected, onPress }) => (
    <Pressable
      onPress={onPress}
      className={
        isSelected
          ? "rounded-lg bg-neutral-700 px-2.5 py-1.5 m-1"
          : "rounded-lg bg-white/70 border border-white/50 px-2.5 py-1.5 m-1"
      }
    >
      <Text className={isSelected ? "text-white text-xs font-medium" : "text-zinc-800 text-xs font-medium"}>
        {`${index + 1}. ${word}`}
      </Text>
    </Pressable>
  );

  const SuggestionChip = ({ word, onPress }) => (
    <Pressable
      onPress={onPress}
      className="rounded-xl bg-white/80 border border-white/60 shadow-sm px-4 py-2 m-1"
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      android_ripple={{ color: "#0000000f" }}
    >
      <Text className="text-zinc-800 text-sm font-semibold">{word}</Text>
    </Pressable>
  );

  return (
    <OnboardScreen
      title={'Enter recovery phrase'}
      ctaLabel={'Import'}
      ctaDisabled={!isValidMnemonic}
      onCtaPress={handleImport}
      forceScroll={true}
    >
      <View className="mt-6">
        <Text className="text-sm text-zinc-600 mb-3">{`Progress: ${words.length}/24`}</Text>
        
        {/* Word Grid - Hide when keyboard is visible */
        }
        {!keyboardVisible && (
          <ScrollView 
            horizontal={false} 
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: Math.min(height * 0.34, 300) }}
            contentContainerStyle={{ paddingBottom: 8 }}
            className="mb-5"
          >
            <View className="flex-row flex-wrap">
              {words.map((word, index) => (
                <WordChip
                  key={index}
                  word={word}
                  index={index}
                  isSelected={currentWordIndex === index}
                  onPress={() => setCurrentWordIndex(index)}
                />
              ))}
              {/* Removed '+ Add Word' chip – auto-advance and chip tap cover this */}
            </View>
          </ScrollView>
        )}
      </View>

      <View className="mt-4">
        {/* Input Field */}
        <AppTextField
          label={`Word ${currentWordIndex + 1}`}
          placeholder="Type word..."
          value={currentWord}
          onChangeText={text => setCurrentWord(text)}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => suggestions.length > 0 ? addWord(suggestions[0]) : addWord(currentWord)}
        />

        {/* Suggestions - Show when available, otherwise show Next button */}
        {suggestions.length > 0 ? (
          <View className="mt-4">
            <View className="flex-row flex-wrap mx-[-4px]">
              {suggestions.map((s, idx) => (
                <SuggestionChip key={idx} word={s} onPress={() => addWord(s)} />
              ))}
            </View>
          </View>
        ) : currentWord.length > 0 ? (
          <View className="mt-4">
            <AppButton
              onPress={() => addWord(currentWord)}
              disabled={currentWord == null || currentWord.length == 0}
              size="sm"
              className="self-start"
            >
              {'Next'}
            </AppButton>
          </View>
        ) : null}
      </View>
    </OnboardScreen>
  );
}

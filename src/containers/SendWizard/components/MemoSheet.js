import React, {useEffect, useState} from 'react';
import AppTextInput from '../../../components/AppTextInput';
import ReceiveRequestSheet from '../../Transfer/ReceiveRequestSheet';
import {getMemoBytes, MEMO_MAX_BYTES} from '../wizardUtils';

// The count shows only near the limit; before that one line says who can
// read the memo.
const COUNT_FROM_BYTES = MEMO_MAX_BYTES - 100;

// The compact form sheet of Request amount's Note, for a private send's memo.
const MemoSheet = ({memo, onApply, onClose, visible}) => {
  const [draft, setDraft] = useState(memo);
  useEffect(() => {
    if (visible) setDraft(memo);
  }, [memo, visible]);

  const bytes = getMemoBytes(draft);
  const tooLong = bytes > MEMO_MAX_BYTES;
  const helperText =
    bytes >= COUNT_FROM_BYTES && !tooLong
      ? `${MEMO_MAX_BYTES - bytes} characters left.`
      : 'Only the recipient can read it.';

  return (
    <ReceiveRequestSheet
      onApply={() => (tooLong ? null : () => onApply(draft.trim()))}
      onClose={onClose}
      title="Memo"
      visible={visible}>
      <AppTextInput
        accessibilityLabel="Memo"
        autoCapitalize="sentences"
        autoCorrect
        autoFocus
        blurOnSubmit
        errorText={tooLong ? 'This memo is too long. Shorten it.' : undefined}
        helperText={helperText}
        multiline
        onChangeText={setDraft}
        placeholder="Optional"
        returnKeyType="done"
        value={draft}
      />
    </ReceiveRequestSheet>
  );
};

export default MemoSheet;

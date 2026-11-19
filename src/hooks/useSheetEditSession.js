import {useRef} from 'react';

/*
  BottomSheetModal unmounts its content while an app alert is open. A sheet
  that keeps its text state inside the content (so the Android cursor does
  not jump) loses the edit on that unmount. This hook keeps a draft outside
  the content, so the content can restore it when it mounts again.

  A new edit session starts when the sheet opens, or when one of sessionDeps
  changes while it is open. Only then the draft starts again from
  startDraft(). sessionKey changes for each new session.
*/
const sameDeps = (a, b) =>
  a != null && a.length === b.length && a.every((dep, i) => Object.is(dep, b[i]));

export default function useSheetEditSession(visible, sessionDeps, startDraft) {
  const draftRef = useRef(null);
  const sessionRef = useRef({key: 0, visible: false, sessionDeps: null});
  const session = sessionRef.current;

  if (draftRef.current == null) draftRef.current = startDraft();
  if (visible && (!session.visible || !sameDeps(session.sessionDeps, sessionDeps))) {
    sessionRef.current = {key: session.key + 1, visible: true, sessionDeps};
    draftRef.current = startDraft();
  } else if (!visible && session.visible) {
    sessionRef.current = {...session, visible: false};
  }

  return {draftRef, sessionKey: sessionRef.current.key};
}

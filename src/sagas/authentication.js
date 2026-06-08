import { all, takeEvery, put, call } from "redux-saga/effects";
import { initAccountWidgets, setWidgets } from "../actions/actionCreators";
import { clearActiveAccountLifecycles, resetServices } from "../actions/actionDispatchers";
import { AUTHENTICATE_USER, SIGN_OUT, SIGN_OUT_COMPLETE } from "../utils/constants/storeType";

export default function * authenticationSaga() {
  yield all([
    takeEvery(SIGN_OUT, handleFinishSignOut),
    takeEvery(AUTHENTICATE_USER, handleAuthenticateUser)
  ]);
}

function * handleFinishSignOut() {
  try {
    yield call(clearActiveAccountLifecycles)
  } catch(e) {
    console.warn(e)
  }

  try {
    yield call(resetServices)
  } catch(e) {
    console.warn(e)
  }
  
  yield put(setWidgets({}))
  yield put({type: SIGN_OUT_COMPLETE})
}

function * handleAuthenticateUser(action) {
  let setWidgetAction;

  try {
    setWidgetAction = yield call(initAccountWidgets, action.activeAccount.accountHash)
  } catch(e) {
    console.warn(e)
  }

  if (setWidgetAction == null) setWidgetAction = setWidgets({})
  
  yield put(setWidgetAction)
}

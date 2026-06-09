import { all, takeEvery, takeLatest, call, put, select } from "redux-saga/effects";
import {
  INIT_VRPC_CHANNEL_START,
  CLOSE_VRPC_CHANNEL,
  SIGN_OUT_COMPLETE,
  INIT_VRPC_CHANNEL_FINISH,
  SET_USER_COINS,
  SET_WATCHED_VRPC_ADDRESSES,
} from "../../utils/constants/storeType";
import VrpcProvider from '../../utils/vrpc/vrpcInterface';
import { activateChainLifecycle } from "../../actions/actions/intervals/dispatchers/lifecycleManager";

export default function * vrpcSaga() {
  yield all([
    takeEvery(INIT_VRPC_CHANNEL_START, handleVrpcChannelInit),
    takeEvery(CLOSE_VRPC_CHANNEL, handleVrpcChannelClose),
    takeLatest(SIGN_OUT_COMPLETE, handleSignOut)
  ]);
}

function * handleVrpcChannelInit(action) {
  yield call(VrpcProvider.initEndpoint, action.payload.systemId, action.payload.endpointAddress)
  yield call(handleFinishVrpcInit, action)
}

function* handleVrpcChannelClose(action) {
  try {
    yield call(
      VrpcProvider.deleteEndpoint,
      action.payload.systemId,
      action.payload.endpointAddress,
    );
  } catch (e) {
    console.warn(e);
  }
}

function * handleSignOut() {
  VrpcProvider.deleteAllEndpoints();
  
  setImmediate(() => {
    VrpcProvider.addDefaultEndpoints();
  })
}

function * handleFinishVrpcInit(action) {
  yield put({type: SET_WATCHED_VRPC_ADDRESSES, payload: action.payload})
  yield put({type: INIT_VRPC_CHANNEL_FINISH, payload: action.payload})
  yield call(refreshVrpcDependentState, action.payload.chainTicker)
}

function * refreshVrpcDependentState(chainTicker) {
  const {activeAccount, activeCoinsForUser} = yield select(state => ({
    activeAccount: state.authentication.activeAccount,
    activeCoinsForUser: state.coins.activeCoinsForUser,
  }));

  if (activeAccount == null || !Array.isArray(activeCoinsForUser)) return;

  const coinObj = activeCoinsForUser.find(coin => coin.id === chainTicker);

  if (coinObj == null) return;

  yield put({
    type: SET_USER_COINS,
    payload: {
      activeCoinsForUser,
    },
  })
  yield call(activateChainLifecycle, coinObj, activeCoinsForUser)
}

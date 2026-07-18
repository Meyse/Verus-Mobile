import {ENABLE_SIGNED_IN_REDESIGN} from '../../../env/index';
import signedInCopy from '../../copy/signedIn';

export const PROFILE_SECURITY_SETTINGS_LABEL = ENABLE_SIGNED_IN_REDESIGN
  ? signedInCopy.settings.securityAndRecovery
  : signedInCopy.settings.walletAndSecurity;

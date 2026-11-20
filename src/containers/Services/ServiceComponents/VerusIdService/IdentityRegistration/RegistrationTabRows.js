import React, {useEffect, useRef, useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import {ChevronRight, CircleAlert} from 'lucide-react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAppTheme} from '../../../../../theme/app';
import AppButton from '../../../../../components/AppButton';
import {createAlert} from '../../../../../actions/actions/alert/dispatchers/alert';
import {deleteRegistration, getRegistrationReview} from '../../../../../utils/identityRegistration';
import {registrationNoticeState} from '../../../../../utils/identityRegistration/noticeState';
import {VerusIdName} from '../VerusIdCard';
import VerusIdOptionsSheet from '../VerusIdOptionsSheet';
import {useRegistrationStyles} from './RegistrationDesign';
import RegistrationDeleteSheet from './RegistrationDeleteSheet';
import useRegistrationAction from './useRegistrationAction';

export const RegistrationGroupTitle = ({title, count}) => {
  const theme = useAppTheme();
  return <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12}}>
    <Text style={[theme.typography.titleRow, {color: theme.colors.textPrimary}]}>{title}</Text>
    <View style={{borderRadius: 10, paddingHorizontal: 6, backgroundColor: theme.colors.surfaceMuted}}>
      <Text style={[theme.typography.labelSm, {color: theme.colors.textSecondary}]}>{count}</Text>
    </View>
  </View>;
};

const progressRoute = jobId => ['IdentityRegistration', {screen: 'IdentityRegistrationProgress', params: {jobId}}];

// The row menu and its confirmation (PR 266 review R7, A + 2). The VerusID
// tab owns one instance outside the grouped rows: a job that moves to another
// group, or the last row that leaves, must not unmount an open sheet or the
// Delete that runs after its closing animation. Delete reads the full saved
// review first, so the confirmation shows the real amounts and expiry block.
export function useRegistrationRowMenu(navigation) {
  const theme = useAppTheme();
  const [menuJob, setMenuJob] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteReview, setDeleteReview] = useState(null);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const {busy, error, run, setError} = useRegistrationAction();
  const failedStep = useRef(null);
  useEffect(() => {
    if (!error) return;
    const title = failedStep.current === 'read' ? 'Registration not opened' : 'Registration not deleted';
    setError(null);
    createAlert(title, error.message);
  }, [error, setError]);
  const openMenu = job => { setMenuJob(job); setMenuVisible(true); };
  const askDelete = job => {
    failedStep.current = 'read';
    return run(context => getRegistrationReview(job.id, context), review => {
      setDeleteReview(review);
      setDeleteVisible(true);
    });
  };
  const confirmDelete = () => {
    const review = deleteReview;
    if (!review?.deletionKind) return;
    failedStep.current = 'delete';
    // The engine checks the kind again under the job lock, so a registration
    // that changed after this sheet opened is kept and reported.
    return run(context => deleteRegistration(review.jobId, review.deletionKind, context));
  };
  const actions = menuJob ? [
    {key: 'progress', label: 'View progress', icon: 'format-list-checks', onPress: () => navigation.navigate(...progressRoute(menuJob.id))},
    ...(menuJob.deletionKind ? [{key: 'delete', label: 'Delete registration', icon: 'trash-can-outline', onPress: () => askDelete(menuJob)}] : []),
  ] : [];
  const sheets = <>
    <VerusIdOptionsSheet visible={menuVisible} onClose={() => setMenuVisible(false)} actions={actions}
      title={menuJob && <VerusIdName accessibilityRole="header" name={menuJob.displayName || menuJob.name} style={theme.typography.titleSheet}
        leafColor={theme.colors.textPrimary} restColor={theme.colors.textSecondary} />} />
    <RegistrationDeleteSheet review={deleteReview} visible={deleteVisible} onClose={() => setDeleteVisible(false)} onDelete={confirmDelete} />
  </>;
  return {openMenu, busy, sheets};
}

// `menu` comes from the tab's useRegistrationRowMenu. Without it, the rows own
// one (a standalone list, as in tests).
export default function RegistrationTabRows({jobs, navigation, group, children, showHeading = true, onLink, menu}) {
  const theme = useAppTheme();
  const styles = useRegistrationStyles();
  const ownMenu = useRegistrationRowMenu(navigation);
  const {openMenu, busy} = menu || ownMenu;
  const rows = Object.values(jobs || {}).filter(job => job.status !== 'complete' && (!group || registrationNoticeState(job).group === group))
    .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  const open = job => {
    if (job.status === 'registered') { onLink({jobId: job.id, name: job.displayName}); return; }
    navigation.navigate('IdentityRegistration', {screen: job.status === 'commitment_prepared' ? 'IdentityCommitmentReview' : 'IdentityRegistrationProgress', params: {jobId: job.id}});
  };
  if (!rows.length && !children) return null;
  return <View style={{gap: 8, marginBottom: 24}}>
    {!!rows.length && group && showHeading && <RegistrationGroupTitle title={group} count={rows.length} />}
    {rows.map(job => {
      const state = registrationNoticeState(job);
      const name = job.displayName || job.name;
      return <View key={job.id} style={[styles.job, {paddingRight: 4}]}><View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${name}. ${state.text}. ${state.action || 'View progress'}`} onPress={() => open(job)} style={styles.flexible}>
          <VerusIdName name={name} style={theme.typography.titleRow} leafColor={theme.colors.textPrimary} restColor={theme.colors.textSecondary} />
          {!!state.text && <View style={[styles.row, {gap: 4}]}>
            {!!state.tone && <CircleAlert size={14} color={theme.colors[`${state.tone}Text`]} />}
            <Text style={[styles.muted, state.tone && {color: theme.colors[`${state.tone}Text`]}, {flexShrink: 1}]}>{state.text}</Text>
          </View>}
        </Pressable>
        {state.action ? <AppButton compact height={32} preserveHeightOnSmallWindow variant="secondary" buttonColor={theme.colors.surface}
          labelStyle={theme.typography.labelSm} onPress={() => open(job)} style={{flexShrink: 0}}>{state.action}</AppButton>
          : <Pressable accessibilityRole="button" accessibilityLabel={`View progress for ${name}`} onPress={() => open(job)} style={styles.iconButton}><ChevronRight size={20} color={theme.colors.textSubtle} /></Pressable>}
        <Pressable accessibilityRole="button" accessibilityLabel={`More options for ${name}`} accessibilityState={{disabled: busy}}
          disabled={busy} onPress={() => openMenu(job)} style={[styles.iconButton, {marginLeft: -8}]}>
          <MaterialCommunityIcons name="dots-horizontal" size={24} color={theme.colors.textSecondary} />
        </Pressable>
      </View></View>;
    })}
    {children}
    {!menu && ownMenu.sheets}
  </View>;
}

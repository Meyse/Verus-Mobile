/*
  ContentStep (Step 2)
  - 2026-02-05: Created as a full-screen content changes review.
  - 2026-02-06: Filter displayUpdates to only pass CMM and private-info groups.
    Authority/status changes are already shown in the High Risk step.
  - 2026-03-06: Updated content-removal framing  so the step focuses on current
    identity publication state instead of permanent deletion.
  - 2026-06-18: Replaced the generic accordion renderer with a focused
    card/filter review layout for identity content changes.
*/
import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, TouchableOpacity, View} from 'react-native';
import {Divider, List, Text} from 'react-native-paper';
import VerusIdContentChangeCard, {
  buildVerusIdContentChangeItems,
  contentChangeMatchesFilter,
  getCmmDataKeyLabel,
  normalizeCmmDisplayUpdates,
} from '../../../../components/VerusIdContentChangeCard';
import {verusIdObjectDataStyles as contentStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {
  VERUSID_CMM_INFO,
  VERUSID_PRIVATE_ADDRESS,
  VERUSID_PRIVATE_INFO,
} from '../../../../utils/constants/verusidObjectData';

const FILTER_OPTIONS = [
  {id: 'all', label: 'All'},
  {id: 'add', label: 'Adds'},
  {id: 'remove', label: 'Removes'},
  {id: 'protect', label: 'Private'},
];

const getPrivateInfoTitle = key =>
  key === VERUSID_PRIVATE_ADDRESS.key ? VERUSID_PRIVATE_ADDRESS.label : key;

const SummaryTile = ({darkMode, label, tone, value}) => (
  <View
    style={[
      contentStyles.contentSummaryTile,
      darkMode && contentStyles.contentSummaryTileDark,
      tone === 'add' && contentStyles.contentSummaryAddTile,
      darkMode && tone === 'add' && contentStyles.contentSummaryAddTileDark,
      tone === 'remove' && contentStyles.contentSummaryRemoveTile,
      darkMode &&
        tone === 'remove' &&
        contentStyles.contentSummaryRemoveTileDark,
    ]}>
    <Text
      style={[
        contentStyles.contentSummaryNumber,
        darkMode && contentStyles.contentSummaryNumberDark,
        tone === 'add' && contentStyles.contentSummaryAddNumber,
        darkMode && tone === 'add' && contentStyles.contentSummaryAddNumberDark,
        tone === 'remove' && contentStyles.contentSummaryRemoveNumber,
        darkMode &&
          tone === 'remove' &&
          contentStyles.contentSummaryRemoveNumberDark,
      ]}>
      {value}
    </Text>
    <Text
      style={[
        contentStyles.contentSummaryLabel,
        darkMode && contentStyles.contentSummaryLabelDark,
      ]}>
      {label}
    </Text>
  </View>
);

const SummaryChip = ({darkMode, label}) => (
  <View
    style={[
      contentStyles.contentSummaryChip,
      darkMode && contentStyles.contentSummaryChipDark,
    ]}>
    <Text
      style={[
        contentStyles.contentSummaryChipText,
        darkMode && contentStyles.contentSummaryChipTextDark,
      ]}>
      {label}
    </Text>
  </View>
);

const FilterButton = ({active, darkMode, label, onPress}) => (
  <TouchableOpacity
    accessibilityRole="button"
    accessibilityState={{selected: active}}
    activeOpacity={0.72}
    onPress={onPress}
    style={[
      contentStyles.contentFilterButton,
      active && contentStyles.contentFilterButtonActive,
      darkMode && active && contentStyles.contentFilterButtonActiveDark,
    ]}>
    <Text
      numberOfLines={1}
      style={[
        contentStyles.contentFilterLabel,
        darkMode && contentStyles.contentFilterLabelDark,
        active && contentStyles.contentFilterLabelActive,
        darkMode && active && contentStyles.contentFilterLabelActiveDark,
      ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const getPrivateInfoFallbackTitle = items => {
  if (items.length === 1) return items[0].title;

  return VERUSID_PRIVATE_INFO.label;
};

const PrivateInfoFallback = ({darkMode, items}) => {
  if (items.length === 0) return null;

  return (
    <View
      style={[
        contentStyles.privateInfoFallback,
        darkMode && contentStyles.privateInfoFallbackDark,
      ]}>
      <Text
        style={[
          contentStyles.privateInfoFallbackTitle,
          darkMode && contentStyles.privateInfoFallbackTitleDark,
        ]}>
        {getPrivateInfoFallbackTitle(items)}
      </Text>
      {items.map((item, index) => (
        <React.Fragment key={item.key}>
          <List.Item
            description={item.description}
            descriptionStyle={[
              contentStyles.privateInfoFallbackItemDescription,
              darkMode && contentStyles.privateInfoFallbackItemDescriptionDark,
            ]}
            onPress={item.onPress}
            title={item.title}
            titleNumberOfLines={2}
            titleStyle={[
              contentStyles.privateInfoFallbackItemTitle,
              darkMode && contentStyles.privateInfoFallbackItemTitleDark,
            ]}
          />
          {index < items.length - 1 && (
            <Divider
              style={
                darkMode ? contentStyles.privateInfoFallbackDividerDark : null
              }
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

const getSingleChangeSummaryLabel = (cmmItems, privateInfoItems) => {
  if (privateInfoItems.length === 1 && cmmItems.length === 0) {
    return '1 private content change';
  }

  const item = cmmItems[0];
  if (!item) return '1 content change';
  if (item.changeType === 'added') return '1 new content key';
  if (item.changeType === 'appended') return '1 added content value';
  if (item.changeType === 'removed') {
    return item.removeMeta?.action === 4
      ? '1 content clear'
      : '1 content removal';
  }

  return '1 content change';
};

const getAvailableFilterOptions = ({
  addCount,
  privateCount,
  removeCount,
  totalContentCount,
}) => {
  if (totalContentCount < 4) return [];

  const categoryCounts = {
    add: addCount,
    remove: removeCount,
    protect: privateCount,
  };
  const usefulFilterIds = Object.keys(categoryCounts).filter(
    key => categoryCounts[key] > 0 && categoryCounts[key] < totalContentCount,
  );

  if (usefulFilterIds.length === 0) return [];

  return FILTER_OPTIONS.filter(option =>
    option.id === 'all' ? true : usefulFilterIds.includes(option.id),
  );
};

const VerusIdContentChanges = ({
  cmmItems,
  cmmUpdates,
  darkMode,
  filterOptions,
  privateInfoItems,
}) => {
  const [filter, setFilter] = useState('all');
  const showFilters = filterOptions.length > 0;
  const filterIsAvailable = filterOptions.some(option => option.id === filter);
  const activeFilter = showFilters && filterIsAvailable ? filter : 'all';

  useEffect(() => {
    if (filter !== activeFilter) {
      setFilter('all');
    }
  }, [activeFilter, filter]);

  const visibleItems = useMemo(
    () =>
      cmmItems.filter(item => contentChangeMatchesFilter(item, activeFilter)),
    [activeFilter, cmmItems],
  );
  const visiblePrivateInfoItems = useMemo(
    () =>
      activeFilter === 'all' || activeFilter === 'protect'
        ? privateInfoItems
        : [],
    [activeFilter, privateInfoItems],
  );
  const hasVisibleItems =
    visibleItems.length > 0 || visiblePrivateInfoItems.length > 0;

  return (
    <View style={contentStyles.contentReviewBody}>
      {showFilters && (
        <View
          style={[
            contentStyles.contentFilterContainer,
            darkMode && contentStyles.contentFilterContainerDark,
          ]}>
          {filterOptions.map(option => (
            <FilterButton
              key={option.id}
              active={filter === option.id}
              darkMode={darkMode}
              label={option.label}
              onPress={() => setFilter(option.id)}
            />
          ))}
        </View>
      )}

      {visibleItems.map(item => (
        <VerusIdContentChangeCard
          key={item.key}
          item={item}
          darkMode={darkMode}
          panelTone={true}
          updateEntry={cmmUpdates[item.key]}
        />
      ))}

      <PrivateInfoFallback
        darkMode={darkMode}
        items={visiblePrivateInfoItems}
      />

      {!hasVisibleItems && (
        <View
          style={[
            contentStyles.contentReviewEmptyState,
            darkMode && contentStyles.contentReviewEmptyStateDark,
          ]}>
          <Text
            style={[
              contentStyles.contentReviewEmptyText,
              darkMode && contentStyles.contentReviewEmptyTextDark,
            ]}>
            No changes match this filter
          </Text>
        </View>
      )}
    </View>
  );
};

const ContentStep = ({
  subjectIdentity,
  displayUpdates,
  cmmDataKeys,
  styles,
}) => {
  const theme = useOnboardingTheme();
  const darkMode = theme.isDark;
  const cmmUpdates = useMemo(
    () =>
      normalizeCmmDisplayUpdates(displayUpdates[VERUSID_CMM_INFO.key] || {}),
    [displayUpdates],
  );
  const getCmmDataKey = useMemo(
    () => iAddr => getCmmDataKeyLabel(iAddr, cmmDataKeys),
    [cmmDataKeys],
  );
  const cmmItems = useMemo(
    () =>
      buildVerusIdContentChangeItems({
        verusId: subjectIdentity,
        cmmUpdates,
        getCmmDataKey,
        changedOnly: true,
      }).filter(item => item.changeType),
    [cmmUpdates, getCmmDataKey, subjectIdentity],
  );
  const privateInfoItems = useMemo(() => {
    const privateUpdates = displayUpdates[VERUSID_PRIVATE_INFO.key] || {};

    return Object.entries(privateUpdates)
      .filter(([, entry]) => Boolean(entry))
      .map(([key, entry]) => ({
        key,
        title: getPrivateInfoTitle(key),
        description: entry.data,
        onPress: entry.onPress,
      }));
  }, [displayUpdates]);
  const totalContentCount = cmmItems.length + privateInfoItems.length;
  const addCount =
    cmmItems.filter(item => item.changeType !== 'removed').length +
    privateInfoItems.length;
  const removeCount = cmmItems.filter(
    item => item.changeType === 'removed',
  ).length;
  const privateCount =
    cmmItems.filter(item => contentChangeMatchesFilter(item, 'protect'))
      .length + privateInfoItems.length;
  const filterOptions = useMemo(
    () =>
      getAvailableFilterOptions({
        addCount,
        privateCount,
        removeCount,
        totalContentCount,
      }),
    [addCount, privateCount, removeCount, totalContentCount],
  );
  const singleChangeSummaryLabel =
    totalContentCount === 1
      ? getSingleChangeSummaryLabel(cmmItems, privateInfoItems)
      : null;

  return (
    <View style={contentStyles.contentReviewRoot}>
      <View style={[styles.header, contentStyles.contentReviewHeader]}>
        <Text style={styles.mainTitle}>
          {totalContentCount === 1
            ? 'Review content change'
            : 'Review content changes'}
        </Text>
        {singleChangeSummaryLabel ? (
          <SummaryChip darkMode={darkMode} label={singleChangeSummaryLabel} />
        ) : (
          <View style={contentStyles.contentSummaryRow}>
            <SummaryTile
              darkMode={darkMode}
              label="content changes"
              value={totalContentCount}
            />
            <SummaryTile
              darkMode={darkMode}
              label="new or added"
              tone="add"
              value={addCount}
            />
            <SummaryTile
              darkMode={darkMode}
              label="will remove"
              tone="remove"
              value={removeCount}
            />
          </View>
        )}
      </View>

      <ScrollView
        style={contentStyles.contentReviewScroll}
        contentContainerStyle={contentStyles.contentReviewScrollContent}>
        <VerusIdContentChanges
          cmmItems={cmmItems}
          cmmUpdates={cmmUpdates}
          darkMode={darkMode}
          filterOptions={filterOptions}
          privateInfoItems={privateInfoItems}
        />
      </ScrollView>
    </View>
  );
};

export default ContentStep;

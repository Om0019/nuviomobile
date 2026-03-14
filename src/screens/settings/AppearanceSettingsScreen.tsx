import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../hooks/useSettings';
import ScreenHeader from '../../components/common/ScreenHeader';
import { SettingsCard, SettingItem, CustomSwitch } from './SettingsComponents';
import { useRealtimeConfig } from '../../hooks/useRealtimeConfig';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

interface AppearanceSettingsContentProps {
    isTablet?: boolean;
}

/**
 * Reusable AppearanceSettingsContent component
 * Can be used inline (tablets) or wrapped in a screen (mobile)
 */
export const AppearanceSettingsContent: React.FC<AppearanceSettingsContentProps> = ({ isTablet = false }) => {
    const { settings, updateSetting } = useSettings();
    const { t } = useTranslation();
    const config = useRealtimeConfig();

    const isItemVisible = (itemId: string) => {
        if (!config?.items) return true;
        const item = config.items[itemId];
        if (item && item.visible === false) return false;
        return true;
    };

    const hasVisibleItems = (itemIds: string[]) => {
        return itemIds.some(id => {
            if (id === 'streams_backdrop' && isTablet) return false;
            return isItemVisible(id);
        });
    };

    return (
        <>
            <SettingsCard title={t('settings.sections.appearance', { defaultValue: 'APPEARANCE' })} isTablet={isTablet}>
                <SettingItem
                    title={t('settings.items.idea', { defaultValue: 'Idea' })}
                    description={t('settings.items.idea_desc', { defaultValue: 'Change the overall visual style of the app' })}
                    icon="sparkles"
                    renderControl={() => (
                        <CustomSwitch
                            value={settings?.ideaMode ?? false}
                            onValueChange={(value) => updateSetting('ideaMode', value)}
                        />
                    )}
                    isLast
                    isTablet={isTablet}
                />
            </SettingsCard>

            {hasVisibleItems(['episode_layout', 'streams_backdrop']) && (
                <SettingsCard title={t('settings.sections.layout')} isTablet={isTablet}>
                    {isItemVisible('episode_layout') && (
                        <SettingItem
                            title={t('settings.items.episode_layout')}
                            description={settings?.episodeLayoutStyle === 'horizontal' ? t('settings.options.horizontal') : t('settings.options.vertical')}
                            icon="grid"
                            renderControl={() => (
                                <CustomSwitch
                                    value={settings?.episodeLayoutStyle === 'horizontal'}
                                    onValueChange={(value) => updateSetting('episodeLayoutStyle', value ? 'horizontal' : 'vertical')}
                                />
                            )}
                            isLast={isTablet || !isItemVisible('streams_backdrop')}
                            isTablet={isTablet}
                        />
                    )}
                    {!isTablet && isItemVisible('streams_backdrop') && (
                        <SettingItem
                            title={t('settings.items.streams_backdrop')}
                            description={t('settings.items.streams_backdrop_desc')}
                            icon="image"
                            renderControl={() => (
                                <CustomSwitch
                                    value={settings?.enableStreamsBackdrop ?? true}
                                    onValueChange={(value) => updateSetting('enableStreamsBackdrop', value)}
                                />
                            )}
                            isLast
                            isTablet={isTablet}
                        />
                    )}
                </SettingsCard>
            )}
        </>
    );
};

/**
 * AppearanceSettingsScreen - Wrapper for mobile navigation
 */
const AppearanceSettingsScreen: React.FC = () => {
    const { currentTheme } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const screenIsTablet = width >= 768;

    return (
        <View style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground }]}>
            <StatusBar barStyle="light-content" />
            <ScreenHeader title={t('settings.appearance')} showBackButton />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
            >
                <AppearanceSettingsContent isTablet={screenIsTablet} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 16,
    },
});

export default AppearanceSettingsScreen;

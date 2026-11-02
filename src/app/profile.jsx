import { exportAccountData } from '@/services/account-export';
import * as ImagePicker from 'expo-image-picker';
import { resolveAvatarUrl, uploadAvatar, removeAvatar } from '@/services/avatar';
import { base64ToUint8Array } from '@/utils/binary';
import * as Linking from 'expo-linking';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Text, TextInput } from '@/components/ui/Typography';
import { FlatList, Modal, Pressable, StyleSheet, Switch, View } from 'react-native';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { ModalForm } from '@/components/ui/ModalForm';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Avatar, CategoryChip } from '@/components/ui/SafarUI';
import { Icon } from '@/components/ui/Icon';
import { useDialog } from '@/components/ui/CustomModal';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { getProfile, saveProfile } from '@/services/profile';
import { messageFromError } from '@/utils/errors';
import { ALL_CURRENCIES } from '@/constants/currencies';
import { CurrencyPicker, CurrencyPickerSheet } from '@/components/CurrencyPicker';

// ─── Data ───────────────────────────────────────────────────────────────────

/** Common currencies shown as quick chips (ISO 4217). */

/** Full ISO 4217 currency list for the searchable picker. */

/** All world languages for the searchable picker. */
const ALL_LANGUAGES = [{
  code: 'af',
  name: 'Afrikaans',
  native: 'Afrikaans'
}, {
  code: 'sq',
  name: 'Albanian',
  native: 'Shqip'
}, {
  code: 'am',
  name: 'Amharic',
  native: 'አማርኛ'
}, {
  code: 'ar',
  name: 'Arabic',
  native: 'العربية'
}, {
  code: 'hy',
  name: 'Armenian',
  native: 'Հայերեն'
}, {
  code: 'az',
  name: 'Azerbaijani',
  native: 'Azərbaycan'
}, {
  code: 'eu',
  name: 'Basque',
  native: 'Euskara'
}, {
  code: 'be',
  name: 'Belarusian',
  native: 'Беларуская'
}, {
  code: 'bn',
  name: 'Bengali',
  native: 'বাংলা'
}, {
  code: 'bs',
  name: 'Bosnian',
  native: 'Bosanski'
}, {
  code: 'bg',
  name: 'Bulgarian',
  native: 'Български'
}, {
  code: 'my',
  name: 'Burmese',
  native: 'မြန်မာ'
}, {
  code: 'ca',
  name: 'Catalan',
  native: 'Català'
}, {
  code: 'zh',
  name: 'Chinese (Simplified)',
  native: '中文（简体）'
}, {
  code: 'zh-TW',
  name: 'Chinese (Traditional)',
  native: '中文（繁體）'
}, {
  code: 'hr',
  name: 'Croatian',
  native: 'Hrvatski'
}, {
  code: 'cs',
  name: 'Czech',
  native: 'Čeština'
}, {
  code: 'da',
  name: 'Danish',
  native: 'Dansk'
}, {
  code: 'nl',
  name: 'Dutch',
  native: 'Nederlands'
}, {
  code: 'en',
  name: 'English',
  native: 'English'
}, {
  code: 'et',
  name: 'Estonian',
  native: 'Eesti'
}, {
  code: 'fi',
  name: 'Finnish',
  native: 'Suomi'
}, {
  code: 'fr',
  name: 'French',
  native: 'Français'
}, {
  code: 'gl',
  name: 'Galician',
  native: 'Galego'
}, {
  code: 'ka',
  name: 'Georgian',
  native: 'ქართული'
}, {
  code: 'de',
  name: 'German',
  native: 'Deutsch'
}, {
  code: 'el',
  name: 'Greek',
  native: 'Ελληνικά'
}, {
  code: 'gu',
  name: 'Gujarati',
  native: 'ગુજરાતી'
}, {
  code: 'ht',
  name: 'Haitian Creole',
  native: 'Kreyòl ayisyen'
}, {
  code: 'he',
  name: 'Hebrew',
  native: 'עברית'
}, {
  code: 'hi',
  name: 'Hindi',
  native: 'हिन्दी'
}, {
  code: 'hu',
  name: 'Hungarian',
  native: 'Magyar'
}, {
  code: 'is',
  name: 'Icelandic',
  native: 'Íslenska'
}, {
  code: 'id',
  name: 'Indonesian',
  native: 'Bahasa Indonesia'
}, {
  code: 'ga',
  name: 'Irish',
  native: 'Gaeilge'
}, {
  code: 'it',
  name: 'Italian',
  native: 'Italiano'
}, {
  code: 'ja',
  name: 'Japanese',
  native: '日本語'
}, {
  code: 'kn',
  name: 'Kannada',
  native: 'ಕನ್ನಡ'
}, {
  code: 'kk',
  name: 'Kazakh',
  native: 'Қазақ'
}, {
  code: 'km',
  name: 'Khmer',
  native: 'ខ្មែរ'
}, {
  code: 'ko',
  name: 'Korean',
  native: '한국어'
}, {
  code: 'ky',
  name: 'Kyrgyz',
  native: 'Кыргызча'
}, {
  code: 'lo',
  name: 'Lao',
  native: 'ລາວ'
}, {
  code: 'lv',
  name: 'Latvian',
  native: 'Latviešu'
}, {
  code: 'lt',
  name: 'Lithuanian',
  native: 'Lietuvių'
}, {
  code: 'lb',
  name: 'Luxembourgish',
  native: 'Lëtzebuergesch'
}, {
  code: 'mk',
  name: 'Macedonian',
  native: 'Македонски'
}, {
  code: 'mg',
  name: 'Malagasy',
  native: 'Malagasy'
}, {
  code: 'ms',
  name: 'Malay',
  native: 'Bahasa Melayu'
}, {
  code: 'ml',
  name: 'Malayalam',
  native: 'മലയാളം'
}, {
  code: 'mt',
  name: 'Maltese',
  native: 'Malti'
}, {
  code: 'mr',
  name: 'Marathi',
  native: 'मराठी'
}, {
  code: 'mn',
  name: 'Mongolian',
  native: 'Монгол'
}, {
  code: 'ne',
  name: 'Nepali',
  native: 'नेपाली'
}, {
  code: 'no',
  name: 'Norwegian',
  native: 'Norsk'
}, {
  code: 'or',
  name: 'Odia',
  native: 'ଓଡ଼ିଆ'
}, {
  code: 'ps',
  name: 'Pashto',
  native: 'پښتو'
}, {
  code: 'fa',
  name: 'Persian',
  native: 'فارسی'
}, {
  code: 'pl',
  name: 'Polish',
  native: 'Polski'
}, {
  code: 'pt',
  name: 'Portuguese',
  native: 'Português'
}, {
  code: 'pa',
  name: 'Punjabi',
  native: 'ਪੰਜਾਬੀ'
}, {
  code: 'ro',
  name: 'Romanian',
  native: 'Română'
}, {
  code: 'ru',
  name: 'Russian',
  native: 'Русский'
}, {
  code: 'sr',
  name: 'Serbian',
  native: 'Srpski'
}, {
  code: 'si',
  name: 'Sinhala',
  native: 'සිංහල'
}, {
  code: 'sk',
  name: 'Slovak',
  native: 'Slovenčina'
}, {
  code: 'sl',
  name: 'Slovenian',
  native: 'Slovenščina'
}, {
  code: 'so',
  name: 'Somali',
  native: 'Soomaali'
}, {
  code: 'es',
  name: 'Spanish',
  native: 'Español'
}, {
  code: 'sw',
  name: 'Swahili',
  native: 'Kiswahili'
}, {
  code: 'sv',
  name: 'Swedish',
  native: 'Svenska'
}, {
  code: 'tl',
  name: 'Tagalog / Filipino',
  native: 'Filipino'
}, {
  code: 'tg',
  name: 'Tajik',
  native: 'Тоҷикӣ'
}, {
  code: 'ta',
  name: 'Tamil',
  native: 'தமிழ்'
}, {
  code: 'tt',
  name: 'Tatar',
  native: 'Татар'
}, {
  code: 'te',
  name: 'Telugu',
  native: 'తెలుగు'
}, {
  code: 'th',
  name: 'Thai',
  native: 'ภาษาไทย'
}, {
  code: 'tr',
  name: 'Turkish',
  native: 'Türkçe'
}, {
  code: 'tk',
  name: 'Turkmen',
  native: 'Türkmen'
}, {
  code: 'uk',
  name: 'Ukrainian',
  native: 'Українська'
}, {
  code: 'ur',
  name: 'Urdu',
  native: 'اردو'
}, {
  code: 'uz',
  name: 'Uzbek',
  native: 'O\'zbek'
}, {
  code: 'vi',
  name: 'Vietnamese',
  native: 'Tiếng Việt'
}, {
  code: 'cy',
  name: 'Welsh',
  native: 'Cymraeg'
}, {
  code: 'xh',
  name: 'Xhosa',
  native: 'isiXhosa'
}, {
  code: 'yi',
  name: 'Yiddish',
  native: 'ייִדיש'
}, {
  code: 'yo',
  name: 'Yoruba',
  native: 'Yorùbá'
}, {
  code: 'zu',
  name: 'Zulu',
  native: 'isiZulu'
}];

/** Preset travel preference chips. */
const PRESET_PREFERENCES = ['Adventure', 'Food', 'Culture', 'Nature', 'Relaxation', 'Family', 'Photography'];
/** Extended suggestion list for custom preferences. */
const SUGGESTED_PREFERENCES = ['Hiking', 'Beaches', 'Wildlife', 'Temples', 'Museums', 'Road trips', 'Mountains', 'Local markets', 'Historical sites', 'Camping', 'Architecture', 'Shopping', 'Waterfalls', 'Wellness', 'Festivals', 'Nightlife', 'Cycling', 'Backpacking', 'Luxury travel', 'Budget travel', 'Eco-tourism', 'Wine & dining', 'Safari', 'Snow & skiing', 'Desert exploration', 'Island hopping', 'City breaks'];
const MAX_PREF_LENGTH = 50;

// ─── Searchable picker modal ──────────────────────────────────────────────────

function SearchablePicker({
  visible,
  title,
  items,
  onSelect,
  onClose
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items;
    return items.filter(i => i.label.toLowerCase().includes(q) || (i.sublabel ?? '').toLowerCase().includes(q) || i.value.toLowerCase().includes(q));
  }, [items, query]);
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={ps.root}>
        <View style={ps.header}>
          <Text style={ps.title}>{title}</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={ps.close}>
            <Icon name="close" size={20} color={colors.text} />
          </Pressable>
        </View>
        <View style={ps.searchBar}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput style={ps.searchInput} placeholder="Search…" placeholderTextColor={colors.placeholder ?? colors.muted} value={query} onChangeText={setQuery} autoFocus autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
        </View>
        <FlatList data={filtered} keyExtractor={item => item.value} keyboardShouldPersistTaps="handled" renderItem={({
        item
      }) => <Pressable style={ps.item} onPress={() => {
        onSelect(item);
        onClose();
        setQuery('');
      }}>
              <Text style={ps.itemCode}>{item.value}</Text>
              <View style={{
          flex: 1
        }}>
                <Text style={ps.itemName}>{item.label}</Text>
                {item.sublabel ? <Text style={ps.itemSub}>{item.sublabel}</Text> : null}
              </View>
            </Pressable>} ListEmptyComponent={<Text style={ps.empty}>No results for &ldquo;{query}&rdquo;</Text>} />
      </View>
    </Modal>;
}
const languageItems = ALL_LANGUAGES.map(l => ({
  value: l.code,
  label: l.name,
  sublabel: l.native
}));

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const {
    user
  } = useAuth();
  const dialog = useDialog();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState(null);
  const [confirmation, setConfirmation] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [customPrefInput, setCustomPrefInput] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const p = await getProfile();
      setProfile(p);
      setAvatar(await resolveAvatarUrl(p.avatar_url).catch(() => null));
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => {
    load();
  }, [load]));
  async function chooseAvatar() {
    if (busy) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        dialog.alert('Photo permission required', 'Please allow photo access to choose a profile image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true
      });
      if (result.canceled || !result.assets?.length) return;
      setBusy(true);
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) throw new Error('Choose an image smaller than 5 MB.');
      let mimeType = asset.mimeType?.toLowerCase();
      if (!mimeType || mimeType === 'image') {
        const uriLower = asset.uri.toLowerCase();
        if (uriLower.endsWith('.png')) mimeType = 'image/png';else if (uriLower.endsWith('.webp')) mimeType = 'image/webp';else mimeType = 'image/jpeg';
      }
      if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
      let bytes;
      if (asset.base64) {
        bytes = base64ToUint8Array(asset.base64);
      } else {
        const res = await fetch(asset.uri);
        const buffer = await res.arrayBuffer();
        bytes = new Uint8Array(buffer);
      }
      if (bytes.byteLength < 50) {
        throw new Error('Could not read image file. Please try another photo.');
      }
      if (bytes.byteLength > 5 * 1024 * 1024) {
        throw new Error('Choose an image smaller than 5 MB.');
      }
      const uploaded = await uploadAvatar(bytes, mimeType);
      setProfile(p => p ? {
        ...p,
        avatar_url: uploaded.profile.avatar_url
      } : p);
      setAvatar(uploaded.displayUrl);
      dialog.alert('Profile photo updated', 'Your photo has been saved privately to your account.');
    } catch (e) {
      dialog.alert('Could not update photo', messageFromError(e));
    } finally {
      setBusy(false);
    }
  }
  function clearAvatar() {
    dialog.alert('Remove profile photo?', 'Your profile will show your initials again.', [{
      text: 'Cancel',
      style: 'cancel'
    }, {
      text: 'Remove',
      onPress: async () => {
        setBusy(true);
        try {
          await removeAvatar();
          setProfile(p => p ? {
            ...p,
            avatar_url: null
          } : p);
          setAvatar(null);
        } catch (e) {
          dialog.alert('Could not remove photo', messageFromError(e));
        } finally {
          setBusy(false);
        }
      }
    }]);
  }
  function change(patch) {
    setProfile(p => p ? {
      ...p,
      ...patch
    } : p);
  }
  async function save() {
    if (!profile?.full_name?.trim()) {
      dialog.alert('Name required', 'Enter the name you would like to use on Safar.');
      return;
    }
    setBusy(true);
    try {
      const saved = await saveProfile({
        ...profile,
        full_name: profile.full_name.trim()
      });
      setProfile(saved);
      const {
        error
      } = await supabase.auth.updateUser({
        data: {
          full_name: saved.full_name
        }
      });
      if (error) throw error;
      setPanel(null);
      dialog.alert('You\'re all set', 'Your profile settings have been saved.');
    } catch (e) {
      dialog.alert('Could not save settings', messageFromError(e));
    } finally {
      setBusy(false);
    }
  }
  async function exportData() {
    setBusy(true);
    try {
      await exportAccountData();
    } catch (e) {
      dialog.alert('Could not export data', messageFromError(e));
    } finally {
      setBusy(false);
    }
  }
  async function passwordEmail() {
    if (!user?.email) return;
    setBusy(true);
    try {
      const {
        error
      } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: Linking.createURL('/reset-password')
      });
      if (error) throw error;
      dialog.alert('Check your inbox', 'A secure password reset link is on its way.');
    } catch (e) {
      dialog.alert('Could not send email', messageFromError(e));
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    dialog.alert('Sign out of Safar?', 'Your saved trips will be waiting when you return.', [{
      text: 'Stay here',
      style: 'cancel'
    }, {
      text: 'Sign out',
      onPress: async () => {
        const {
          error
        } = await supabase.auth.signOut();
        if (error) dialog.alert('Could not sign out', messageFromError(error));
      }
    }]);
  }
  async function deleteAccount() {
    if (confirmation !== 'DELETE') return;
    setBusy(true);
    try {
      const {
        error
      } = await supabase.rpc('delete_my_account');
      if (error) throw error;
      await supabase.auth.signOut({
        scope: 'local'
      });
    } catch (e) {
      dialog.alert('Could not delete account', messageFromError(e));
    } finally {
      setBusy(false);
      setPanel(null);
    }
  }

  /** Add a custom travel preference, avoiding duplicates. */
  function addCustomPreference() {
    const trimmed = customPrefInput.trim();
    if (!trimmed || !profile) return;
    if (trimmed.length > MAX_PREF_LENGTH) {
      dialog.alert('Too long', `Preference must be ${MAX_PREF_LENGTH} characters or fewer.`);
      return;
    }
    const normalized = trimmed.replace(/\s+/g, ' ');
    if (profile.travel_preferences.some(p => p.toLowerCase() === normalized.toLowerCase())) {
      dialog.alert('Already added', `"${normalized}" is already in your preferences.`);
      return;
    }
    change({
      travel_preferences: [...profile.travel_preferences, normalized]
    });
    setCustomPrefInput('');
  }
  const currentLanguage = ALL_LANGUAGES.find(l => l.code === profile?.preferred_language);
  const currentCurrency = ALL_CURRENCIES.find(c => c.code === profile?.preferred_currency);
  return <View style={{
    flex: 1
  }}>
      <Screen>
        <Text style={s.title}>Profile & settings</Text>
        {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} /> : profile ? <>
            <View style={s.identity}>
              <Pressable accessibilityLabel="Change profile photo" disabled={busy} onPress={chooseAvatar}>
                <Avatar name={profile.full_name || user?.email || 'Traveler'} uri={avatar} size={70} />
                <View style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              backgroundColor: colors.primary,
              padding: 5,
              borderRadius: 14
            }}>
                  <Icon name="camera" size={15} color="#fff" />
                </View>
              </Pressable>
              <View style={{
            flex: 1,
            gap: 4
          }}>
                <Text style={s.name}>{profile.full_name || 'Traveler'}</Text>
                <Text style={s.email}>{user?.email}</Text>
                <View style={s.verified}>
                  <Icon name="verified" size={14} />
                  <Text style={s.verifiedText}>Verified email</Text>
                </View>
              </View>
            </View>
            <View style={s.section}>
              <Setting icon="user" title="Personal details" detail="Your name and preferred language" onPress={() => setPanel('Personal details')} />
              <Setting icon="explore" title="Travel preferences" detail={profile.travel_preferences.join(', ') || 'Make every journey feel like you'} onPress={() => setPanel('Travel preferences')} />
              <Setting icon="wallet" title="Preferred currency" detail={`${profile.preferred_currency}${currentCurrency?.symbol ? ` (${currentCurrency.symbol})` : ''}`} onPress={() => setPanel('Preferred currency')} />
            </View>
            <View style={s.section}>
              <Setting icon="heart" title="Saved destinations" onPress={() => router.push({
            pathname: '/explore',
            params: {
              category: 'Saved'
            }
          })} />
              <Setting icon="users" title="Invite family & friends" detail="Open a trip to invite, or join with a code" onPress={() => setPanel('Invite family & friends')} />
              <Setting icon="trips" title="Shared trips" onPress={() => router.push({
            pathname: '/trips',
            params: {
              filter: 'shared'
            }
          })} />
            </View>
            <View style={s.section}>
              <Setting icon="bell" title="Notifications" detail={profile.notifications_enabled ? 'Preference enabled' : 'Preference disabled'} onPress={() => setPanel('Notifications')} />
              <Setting icon="verified" title="Privacy & security" onPress={() => setPanel('Privacy & security')} />
            </View>
            <Button label="Sign out" icon="logout" variant="secondary" onPress={signOut} />
            <Text style={s.footer}>Safar · Your journey, your way.</Text>
          </> : null}
      </Screen>
      <BottomNav />

      {/* ─── Personal Details panel ─── */}
      <ModalForm visible={panel === 'Personal details'} title="Personal details" onClose={() => !busy && setPanel(null)}>
        {profile ? <>
            <View style={{
          alignItems: 'center',
          gap: 12
        }}>
              <Avatar name={profile.full_name || 'Traveler'} uri={avatar} size={82} />
              <Button label="Choose profile photo" icon="camera" variant="secondary" loading={busy} onPress={chooseAvatar} />
              {profile.avatar_url ? <Button label="Remove photo" variant="ghost" disabled={busy} onPress={clearAvatar} /> : null}
              <Text style={s.copy}>JPEG, PNG or WebP · up to 5 MB · private to your account</Text>
            </View>
            <Field icon="user" label="Full name" value={profile.full_name ?? ''} onChangeText={full_name => change({
          full_name
        })} />
            <Text style={s.label}>Preferred language</Text>
            {/* Quick language chips */}
            <View style={s.chips}>
              {[{
            code: 'en',
            name: 'English'
          }, {
            code: 'hi',
            name: 'Hindi'
          }, {
            code: 'fr',
            name: 'French'
          }, {
            code: 'ja',
            name: 'Japanese'
          }, {
            code: 'es',
            name: 'Spanish'
          }, {
            code: 'de',
            name: 'German'
          }].map(l => <CategoryChip key={l.code} label={l.name} selected={profile.preferred_language === l.code} onPress={() => change({
            preferred_language: l.code
          })} />)}
              <Pressable style={s.addChip} onPress={() => setShowLanguagePicker(true)} accessibilityRole="button" accessibilityLabel="Browse all languages">
                <Icon name="plus" size={14} color={colors.primary} />
                <Text style={s.addChipText}>More languages</Text>
              </Pressable>
            </View>
            {currentLanguage && !['en', 'hi', 'fr', 'ja', 'es', 'de'].includes(currentLanguage.code) ? <View style={s.selectedBadge}>
                <Text style={s.selectedBadgeText}>Selected: {currentLanguage.name} ({currentLanguage.native})</Text>
              </View> : null}
            <Text style={s.copy}>This stores your language preference. Safar&apos;s interface is currently in English. AI travel guidance may use your preferred language.</Text>
            <Button label="Save details" loading={busy} onPress={save} />
          </> : null}
      </ModalForm>

      {/* ─── Preferred Currency panel ─── */}
      <ModalForm visible={panel === 'Preferred currency'} title="Preferred currency" onClose={() => !busy && setPanel(null)}>
        {profile ? <>
            <Text style={s.label}>Your currency</Text>
            <CurrencyPicker value={profile.preferred_currency} onChange={value => change({
          preferred_currency: value
        })} onMore={() => setShowCurrencyPicker(true)} />
            {currentCurrency ? <View style={s.selectedBadge}>
                <Text style={s.selectedBadgeText}>{currentCurrency.code} — {currentCurrency.name}{currentCurrency.symbol ? ` (${currentCurrency.symbol})` : ''}</Text>
              </View> : null}
            <Text style={s.copy}>This currency is used throughout trip planning and AI itinerary estimates. No live exchange rates are applied.</Text>
            <Button label="Save currency" loading={busy} onPress={save} />
          </> : null}
      </ModalForm>

      {/* ─── Travel Preferences panel ─── */}
      <ModalForm visible={panel === 'Travel preferences'} title="Travel preferences" onClose={() => !busy && setPanel(null)}>
        {profile ? <>
            <Text style={s.label}>What do you love?</Text>
            <View style={s.chips}>
              {[...new Set([...PRESET_PREFERENCES, ...SUGGESTED_PREFERENCES, ...profile.travel_preferences])].map(p => {
            const selected = profile.travel_preferences.includes(p);
            return <CategoryChip key={p} label={p} selected={selected} onPress={() => change({
              travel_preferences: selected ? profile.travel_preferences.filter(v => v !== p) : [...profile.travel_preferences, p]
            })} />;
          })}
            </View>
            <Text style={s.label}>Add a custom preference</Text>
            <View style={s.addPrefRow}>
              <TextInput style={s.prefInput} placeholder="e.g. Waterfalls, Wine tasting…" placeholderTextColor={colors.muted} value={customPrefInput} onChangeText={setCustomPrefInput} maxLength={MAX_PREF_LENGTH} returnKeyType="done" onSubmitEditing={addCustomPreference} autoCapitalize="words" />
              <Pressable style={s.addPrefBtn} onPress={addCustomPreference} accessibilityRole="button" accessibilityLabel="Add preference">
                <Icon name="plus" size={18} color="#fff" />
              </Pressable>
            </View>
            {profile.travel_preferences.length > 0 ? <>
                <Text style={s.label}>Your saved preferences</Text>
                <View style={s.chips}>
                  {profile.travel_preferences.map(p => <Pressable key={p} style={s.removableChip} onPress={() => change({
              travel_preferences: profile.travel_preferences.filter(v => v !== p)
            })}>
                      <Text style={s.removableChipText}>{p}</Text>
                      <Icon name="close" size={12} color={colors.primary} />
                    </Pressable>)}
                </View>
              </> : null}
            <Text style={s.copy}>Safar AI uses these preferences to personalize your trip itineraries.</Text>
            <Button label="Save preferences" loading={busy} onPress={save} />
          </> : null}
      </ModalForm>

      {/* ─── Notifications panel ─── */}
      <ModalForm visible={panel === 'Notifications'} title="Notifications" onClose={() => !busy && setPanel(null)}>
        {profile ? <>
            <View style={s.toggle}>
              <View style={{
            flex: 1
          }}>
                <Text style={s.label}>Travel updates</Text>
                <Text style={s.copy}>Save your preference for future trip reminders. Push reminders are not available yet.</Text>
              </View>
              <Switch value={profile.notifications_enabled} onValueChange={notifications_enabled => change({
            notifications_enabled
          })} trackColor={{
            true: colors.accent
          }} />
            </View>
            <Button label="Save preference" loading={busy} onPress={save} />
          </> : null}
      </ModalForm>

      {/* ─── Privacy & Security panel ─── */}
      <ModalForm visible={panel === 'Privacy & security'} title="Privacy & security" onClose={() => setPanel(null)}>
        <Text style={s.copy}>Your trips are private unless you invite someone. You control whether each guest can view or edit a shared trip.</Text>
        <Button icon="key" label="Send password reset email" loading={busy} onPress={passwordEmail} />
        <Text style={s.copy}>Export includes your profile, plans and accessible shared trip records, but not original photos or passwords. Save it somewhere private.</Text>
        <Button icon="download" label="Export my data (JSON)" loading={busy} onPress={exportData} />
        <Button label="Delete my account" variant="danger" onPress={() => setPanel('Delete account')} />
      </ModalForm>

      {/* ─── Delete Account panel ─── */}
      <ModalForm visible={panel === 'Delete account'} title="Delete account" onClose={() => !busy && setPanel(null)}>
        <Text style={s.copy}>This permanently deletes your account and owned trips. Type DELETE to confirm.</Text>
        <Field value={confirmation} onChangeText={setConfirmation} placeholder="DELETE" autoCapitalize="characters" />
        <Button label="Delete permanently" variant="danger" loading={busy} disabled={confirmation !== 'DELETE'} onPress={deleteAccount} />
      </ModalForm>

      {/* ─── Invite panel ─── */}
      <ModalForm visible={panel === 'Invite family & friends'} title="Invite family & friends" onClose={() => setPanel(null)}>
        <Text style={s.copy}>Choose a trip to create an invitation, or join a trip someone shared with you.</Text>
        <Button label="Choose a trip to share" onPress={() => {
        setPanel(null);
        router.push('/trips');
      }} />
        <Button label="Join with a code" variant="secondary" onPress={() => {
        setPanel(null);
        router.push('/join');
      }} />
      </ModalForm>

      {/* ─── Searchable pickers (rendered outside ModalForm so they overlay correctly) ─── */}
      <CurrencyPickerSheet visible={showCurrencyPicker} value={profile?.preferred_currency ?? 'INR'} onSelect={value => change({
      preferred_currency: value
    })} onClose={() => setShowCurrencyPicker(false)} />
      <SearchablePicker visible={showLanguagePicker} title="Select language" items={languageItems} onSelect={item => change({
      preferred_language: item.value
    })} onClose={() => setShowLanguagePicker(false)} />
    </View>;
}
function Setting({
  icon,
  title,
  detail,
  onPress
}) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={s.row}>
      <View style={s.icon}><Icon name={icon} size={21} /></View>
      <View style={{
      flex: 1
    }}>
        <Text style={s.label}>{title}</Text>
        {detail ? <Text style={s.copy}>{detail}</Text> : null}
      </View>
      <Icon name="chevron-right" size={19} color={colors.muted} />
    </Pressable>;
}
const s = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 22
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    backgroundColor: colors.accentSoft,
    borderRadius: 24,
    marginBottom: 24
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginTop: 10,
    lineHeight: 28
  },
  email: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 0
  },
  copy: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 3
  },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  verifiedText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700'
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
    paddingHorizontal: 16
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    minHeight: 72,
    borderBottomWidth: 0.5,
    borderColor: colors.border,
    paddingVertical: 14
  },
  icon: {
    padding: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12
  },
  label: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14
  },
  footer: {
    textAlign: 'center',
    color: colors.muted,
    marginTop: 24,
    fontSize: 12
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginBottom: 4
  },
  toggle: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center'
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  addChipText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12
  },
  selectedBadge: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: 6
  },
  selectedBadgeText: {
    color: colors.accentStrong,
    fontWeight: '700',
    fontSize: 12
  },
  addPrefRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8
  },
  prefInput: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.border
  },
  addPrefBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  removableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.accentBorder
  },
  removableChipText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12
  }
});
const ps = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text
  },
  close: {
    padding: 8
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderColor: colors.border
  },
  itemCode: {
    fontWeight: '800',
    color: colors.primary,
    fontSize: 13,
    minWidth: 44
  },
  itemName: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13
  },
  itemSub: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
    padding: 30
  }
});
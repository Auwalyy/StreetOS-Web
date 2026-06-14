import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl, Animated } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../store/authStore';
import { aiApi, transactionApi } from '../../api/services';
import { Card, ScoreRing, Badge, Button, Spinner, ScreenHeader, SectionHeader } from '../../components/UI';
import { colors, typography, spacing, radius } from '../../theme';

const TABS = [
  { key: 'advisor', label: '💡 Advisor' },
  { key: 'voice', label: '🎤 Voice' },
  { key: 'loan', label: '🏦 Loan' },
  { key: 'passport', label: '📋 Passport' },
];

export default function AIAdvisorScreen() {
  const { currentBusiness } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState('advisor');
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState(null);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('idle'); // idle | recording | processing

  const { data: advice, isLoading: adviceLoading, refetch, isRefetching } = useQuery({
    queryKey: ['ai-advice', currentBusiness?._id],
    queryFn: () => aiApi.getAdvice(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
    staleTime: 5 * 60 * 1000,
  });

  const { data: loan, isLoading: loanLoading } = useQuery({
    queryKey: ['loan-readiness', currentBusiness?._id],
    queryFn: () => aiApi.getLoanReadiness(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness && tab === 'loan',
  });

  const { data: passport, isLoading: passportLoading } = useQuery({
    queryKey: ['passport', currentBusiness?._id],
    queryFn: () => aiApi.getPassport(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness && tab === 'passport',
  });

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow microphone access to use voice entry.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
      setRecordingStatus('recording');
    } catch (err) {
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      setRecordingStatus('processing');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setRecording(null);
      // Send audio URI to backend for transcription
      // Since the backend uses rule-based NLP on text, we simulate
      // by prompting user to confirm what was said
      setRecordingStatus('idle');
      Alert.alert(
        '🎤 Recording Complete',
        'Review and edit your spoken transaction below, then tap Parse.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      setRecordingStatus('idle');
      Alert.alert('Error', 'Failed to stop recording.');
    }
  };

  const handleMicPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const { mutate: parseVoice, isPending: parsing } = useMutation({
    mutationFn: () => aiApi.parseVoice(currentBusiness._id, { transcript, language: 'en-NG' }),
    onSuccess: ({ data }) => setParsed(data.data.parsed),
    onError: () => Alert.alert('Error', 'Failed to parse voice input'),
  });

  const { mutate: confirmTx, isPending: confirming } = useMutation({
    mutationFn: () => transactionApi.create(currentBusiness._id, { ...parsed, isVoiceEntry: true, voiceTranscript: transcript }),
    onSuccess: () => {
      qc.invalidateQueries(['transactions']);
      Alert.alert('✅', 'Transaction saved from voice!');
      setParsed(null);
      setTranscript('');
    },
    onError: () => Alert.alert('Error', 'Failed to create transaction'),
  });

  const renderAdvisor = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}>
      {adviceLoading ? <Spinner /> : advice ? (
        <>
          {/* Summary */}
          <Card>
            <SectionHeader title="📊 Summary" />
            <View style={styles.summaryGrid}>
              {[
                { label: 'Revenue', value: `₦${advice.summary?.revenue?.toLocaleString() || 0}` },
                { label: 'Expenses', value: `₦${advice.summary?.expenses?.toLocaleString() || 0}` },
                { label: 'Profit', value: `₦${advice.summary?.profit?.toLocaleString() || 0}` },
                { label: 'Margin', value: `${advice.summary?.margin || 0}%` },
              ].map((s, i) => (
                <View key={i} style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>{s.label}</Text>
                  <Text style={styles.summaryValue}>{s.value}</Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Warnings */}
          {advice.warnings?.length > 0 ? (
            <Card>
              <SectionHeader title="⚠️ Warnings" />
              {advice.warnings.map((w, i) => (
                <View key={i} style={styles.warningItem}>
                  <Text style={styles.warningText}>{w}</Text>
                </View>
              ))}
            </Card>
          ) : (
            <View style={styles.allGood}>
              <Text style={styles.allGoodText}>✅ No critical warnings — your business looks healthy!</Text>
            </View>
          )}

          {/* Recommendations */}
          <Card>
            <SectionHeader title="💡 Recommendations & Opportunities" />
            {[...(advice.recommendations || []), ...(advice.opportunities || [])].map((r, i) => (
              <View key={i} style={styles.recItem}>
                <Text style={{ fontSize: 14 }}>•</Text>
                <Text style={styles.recText}>{r}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );

  const renderVoice = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
      <Card>
        <Text style={styles.voiceTitle}>🎤 Voice Transaction Entry</Text>
        <Text style={styles.voiceHint}>Say: "I sold 3 bags of rice for 45,000 naira"</Text>

        <View style={styles.micWrap}>
          <TouchableOpacity
            onPress={handleMicPress}
            activeOpacity={0.85}
            style={[
              styles.micBtn,
              isRecording && styles.micBtnRecording,
            ]}
          >
            <Text style={{ fontSize: 36 }}>{isRecording ? '⏹️' : '🎤'}</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: typography.sm, color: colors.textSecondary, marginTop: 8 }}>
            {recordingStatus === 'recording' ? '🔴 Recording... tap to stop' :
             recordingStatus === 'processing' ? '⏳ Processing...' :
             'Tap to speak'}
          </Text>
        </View>

        <Text style={[styles.voiceTitle, { marginTop: 16, fontSize: typography.sm }]}>Or type your transaction:</Text>
        <TextInput
          style={styles.voiceInput}
          value={transcript}
          onChangeText={setTranscript}
          placeholder="e.g. Musa bought 5 cartons of juice for 12,500 naira..."
          placeholderTextColor={colors.gray400}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        {transcript ? (
          <Button title="Parse Transaction 🔍" onPress={() => parseVoice()} loading={parsing} style={{ marginTop: 12 }} />
        ) : null}
      </Card>

      {parsed ? (
        <Card style={{ backgroundColor: colors.successBg, borderColor: '#86efac' }}>
          <Text style={styles.parsedTitle}>✅ Parsed Transaction</Text>
          <View style={styles.parsedGrid}>
            {[
              ['Type', parsed.type],
              ['Amount', `₦${(parsed.amount || 0).toLocaleString()}`],
              ['Status', parsed.paymentStatus || 'paid'],
            ].map(([k, v]) => (
              <View key={k} style={styles.parsedItem}>
                <Text style={styles.parsedKey}>{k}</Text>
                <Text style={styles.parsedVal}>{v}</Text>
              </View>
            ))}
          </View>
          {parsed.description ? <Text style={styles.parsedDesc}>{parsed.description}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Button title="Clear" variant="secondary" onPress={() => { setParsed(null); setTranscript(''); }} style={{ flex: 1 }} size="sm" />
            <Button title="Confirm & Save ✓" variant="success" onPress={() => confirmTx()} loading={confirming} style={{ flex: 1 }} size="sm" />
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );

  const renderLoan = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
      {loanLoading ? <Spinner /> : loan ? (
        <>
          <Card style={{ alignItems: 'center', padding: spacing.xl }}>
            <Text style={styles.loanTitle}>Loan Readiness Score</Text>
            <ScoreRing score={loan.loanReadinessScore} size={130} />
            <Badge label={`${loan.riskLevel?.toUpperCase()} RISK`} color={loan.riskLevel === 'low' ? 'green' : loan.riskLevel === 'medium' ? 'yellow' : 'red'} style={{ marginTop: 12 }} />
          </Card>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Card style={{ flex: 1, alignItems: 'center', padding: 16 }}>
              <Text style={styles.creditScore}>{loan.creditScore}</Text>
              <Text style={{ fontSize: typography.xs, color: colors.textSecondary }}>Credit Score</Text>
              <Text style={{ fontSize: typography.xs, color: colors.textMuted }}>out of 850</Text>
            </Card>
            <Card style={{ flex: 1, alignItems: 'center', padding: 16 }}>
              <Text style={styles.creditScore}>₦{(loan.maxLoanEstimate || 0).toLocaleString()}</Text>
              <Text style={{ fontSize: typography.xs, color: colors.textSecondary }}>Max Loan</Text>
              <Text style={{ fontSize: typography.xs, color: colors.textMuted }}>estimate</Text>
            </Card>
          </View>
          <Card>
            <SectionHeader title="📊 Credit Factors" />
            {loan.factors?.map((f, i) => (
              <View key={i} style={[styles.factorItem, { backgroundColor: f.status === 'good' || f.status === 'excellent' ? colors.successBg : f.status === 'fair' ? colors.warningBg : colors.dangerBg }]}>
                <Text style={{ fontSize: 16 }}>{f.status === 'good' || f.status === 'excellent' ? '✅' : '⚠️'}</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: typography.sm, fontWeight: '700', color: colors.text }}>{f.factor}</Text>
                  <Text style={{ fontSize: typography.xs, color: colors.textSecondary, marginTop: 2 }}>{f.note}</Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );

  const renderPassport = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
      {passportLoading ? <Spinner /> : (
        <View style={styles.passport}>
          {/* Header */}
          <View style={styles.passportHeader}>
            <View style={styles.passportLogo}>
              <Text style={{ fontSize: 28, fontWeight: '900', color: colors.white }}>{currentBusiness?.name?.[0]}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.passportName}>{currentBusiness?.name}</Text>
              <Text style={styles.passportCat}>{currentBusiness?.category?.replace('_', ' ')}</Text>
              <Text style={styles.passportLoc}>📍 {currentBusiness?.address?.city}, {currentBusiness?.address?.state}</Text>
            </View>
            <View style={styles.passportBadge}>
              <Text style={{ fontSize: 9, color: colors.white, fontWeight: '700', textAlign: 'center' }}>BUSINESS{'\n'}PASSPORT</Text>
            </View>
          </View>

          {/* Scores */}
          <View style={styles.passportScores}>
            {[
              { label: 'Loan Ready', value: `${loan?.loanReadinessScore ?? '—'}%` },
              { label: 'Credit', value: `${loan?.creditScore ?? '—'}` },
              { label: 'Risk', value: loan?.riskLevel ?? '—' },
            ].map((s, i) => (
              <View key={i} style={styles.passportScoreItem}>
                <Text style={styles.passportScoreVal}>{s.value}</Text>
                <Text style={styles.passportScoreLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.passportFooter}>Generated by StreetOS AI · {new Date().getFullYear()}</Text>
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="🤖 AI Advisor" subtitle="Powered by StreetOS Intelligence" />

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tabItem, tab === t.key && styles.tabItemActive]}>
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingTop: 16 }}>
        {tab === 'advisor' && renderAdvisor()}
        {tab === 'voice' && renderVoice()}
        {tab === 'loan' && renderLoan()}
        {tab === 'passport' && renderPassport()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: 8, paddingVertical: 10, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  tabItem: { flex: 1, paddingVertical: 8, borderRadius: radius.lg, alignItems: 'center', backgroundColor: colors.gray100 },
  tabItemActive: { backgroundColor: colors.primary },
  tabLabel: { fontSize: 11, fontWeight: '600', color: colors.gray600 },
  tabLabelActive: { color: colors.white },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryItem: { width: '47%', backgroundColor: colors.gray50, borderRadius: radius.md, padding: 12 },
  summaryLabel: { fontSize: typography.xs, color: colors.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: typography.lg, fontWeight: '800', color: colors.text },
  warningItem: { backgroundColor: '#fffbeb', borderRadius: radius.md, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#fde68a' },
  warningText: { fontSize: typography.sm, color: '#92400e', lineHeight: 18 },
  allGood: { backgroundColor: colors.successBg, borderRadius: radius.lg, padding: 16, alignItems: 'center' },
  allGoodText: { fontSize: typography.sm, color: '#166534', fontWeight: '600' },
  recItem: { flexDirection: 'row', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.gray50, alignItems: 'flex-start' },
  recText: { flex: 1, fontSize: typography.sm, color: colors.text, lineHeight: 20 },
  voiceTitle: { fontSize: typography.base, fontWeight: '700', color: colors.text, marginBottom: 6 },
  voiceHint: { fontSize: typography.sm, color: colors.textSecondary, marginBottom: 16 },
  micWrap: { alignItems: 'center', paddingVertical: 20 },
  micBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.primary },
  micBtnRecording: { backgroundColor: '#fee2e2', borderColor: colors.danger },
  voiceInput: { borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.lg, padding: 14, fontSize: typography.sm, color: colors.text, minHeight: 80, marginTop: 8 },
  parsedTitle: { fontSize: typography.base, fontWeight: '700', color: '#166534', marginBottom: 12 },
  parsedGrid: { flexDirection: 'row', gap: 10 },
  parsedItem: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, padding: 10, alignItems: 'center' },
  parsedKey: { fontSize: typography.xs, color: colors.textSecondary, marginBottom: 4 },
  parsedVal: { fontSize: typography.sm, fontWeight: '700', color: colors.text, textTransform: 'capitalize' },
  parsedDesc: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 10, fontStyle: 'italic' },
  loanTitle: { fontSize: typography.base, fontWeight: '700', color: colors.text, marginBottom: 16 },
  creditScore: { fontSize: 22, fontWeight: '900', color: colors.primary },
  factorItem: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: radius.md, marginBottom: 8 },
  passport: { backgroundColor: colors.gray900, borderRadius: radius.xl, padding: spacing.xl, gap: 16 },
  passportHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)' },
  passportLogo: { width: 52, height: 52, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  passportName: { fontSize: typography.xl, fontWeight: '900', color: colors.white },
  passportCat: { fontSize: typography.sm, color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' },
  passportLoc: { fontSize: typography.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  passportBadge: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 8 },
  passportScores: { flexDirection: 'row', gap: 10 },
  passportScoreItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.md, padding: 12, alignItems: 'center' },
  passportScoreVal: { fontSize: typography.xl, fontWeight: '900', color: colors.primary, textTransform: 'capitalize' },
  passportScoreLabel: { fontSize: typography.xs, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  passportFooter: { fontSize: typography.xs, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
});

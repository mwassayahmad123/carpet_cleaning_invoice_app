import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import { buildInvoiceHtml, buildInvoiceMeta, buildInvoiceText } from './invoiceTemplate';

const COMPANY = {
  name: 'Five Star Carpet Cleaning Services LTD',
  address: '8 Kirkwall Spur, SL1 3XY, Slough',
  phone: '+44 7871 062227',
  whatsapp: '+44 7871 062227',
  email: 'fivestarservicesltduk@gmail.com',
  website: 'https://fivestarcarpetcleaning.co.uk',
};

function isBlank(s) {
  return !String(s ?? '').trim();
}

function Field({ label, value, onChangeText, keyboardType, placeholder, multiline, numberOfLines }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
      />
    </View>
  );
}

function PreviewRow({ label, value }) {
  return (
    <View style={styles.previewRow}>
      <Text style={styles.previewLabel}>{label}</Text>
      <Text style={styles.previewValue}>{value || '—'}</Text>
    </View>
  );
}

export default function InvoiceScreen() {
  const [form, setForm] = useState({
    customerName: '',
    customerAddress: '',
    postCode: '',
    jobDescription: '',
    customerPhone: '',
    notes: '',
    totalAmount: '',
    paymentStatus: 'UNPAID', // UNPAID | PAID
  });

  const [meta, setMeta] = useState(null);
  const [shareVisible, setShareVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const invoiceReady = useMemo(() => {
    return (
      !isBlank(form.customerName) &&
      !isBlank(form.customerAddress) &&
      !isBlank(form.postCode) &&
      !isBlank(form.jobDescription) &&
      !isBlank(form.customerPhone) &&
      !isBlank(form.totalAmount)
    );
  }, [form]);

  const invoiceText = useMemo(() => {
    if (!meta) return '';
    return buildInvoiceText({ meta, form });
  }, [meta, form]);

  const onGenerate = () => {
    if (!invoiceReady) {
      Alert.alert('Missing info', 'Please fill all required fields before generating the invoice.');
      return;
    }
    setMeta(buildInvoiceMeta());
  };

  async function createPdfFileUri() {
    const safeMeta = meta ?? buildInvoiceMeta();
    const html = buildInvoiceHtml({ meta: safeMeta, form });
    const { uri } = await Print.printToFileAsync({ html });

    // Copy to a nicer filename for sharing (especially on Android).
    const filename = `invoice-${safeMeta.invoiceNo}.pdf`.replaceAll(':', '-').replaceAll('/', '-');
    const target = `${FileSystem.cacheDirectory}${filename}`;
    try {
      await FileSystem.copyAsync({ from: uri, to: target });
      return target;
    } catch {
      return uri;
    }
  }

  async function shareViaGmail() {
    setBusy(true);
    try {
      if (!meta) setMeta(buildInvoiceMeta());

      const pdfUri = await createPdfFileUri();
      const isMailAvailable = await MailComposer.isAvailableAsync();

      if (isMailAvailable) {
        await MailComposer.composeAsync({
          subject: `Invoice - ${form.customerName} (${meta?.invoiceNo || ''})`,
          recipients: [],
          body: invoiceText,
          attachments: [pdfUri],
        });
        return;
      }

      // Fallback: system share sheet (user can pick Gmail)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Invoice (Gmail)',
        });
        return;
      }

      await Share.share({ message: invoiceText });
    } finally {
      setBusy(false);
      setShareVisible(false);
    }
  }

  async function shareViaWhatsApp() {
    setBusy(true);
    try {
      if (!meta) setMeta(buildInvoiceMeta());

      // Best effort: share PDF using system sheet (user chooses WhatsApp)
      const pdfUri = await createPdfFileUri();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Invoice (WhatsApp)',
        });
        return;
      }

      // Fallback: text share (WhatsApp can be chosen)
      await Share.share({ message: invoiceText });
    } finally {
      setBusy(false);
      setShareVisible(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerCard}>
          <Text style={styles.companyName}>{COMPANY.name}</Text>
          <Text style={styles.companyLine}>{COMPANY.address}</Text>
          <Text style={styles.companyLine}>Phone: {COMPANY.phone}</Text>
          <Text style={styles.companyLine}>WhatsApp: {COMPANY.whatsapp}</Text>
          <Text style={styles.companyLine}>Email: {COMPANY.email}</Text>
          <Text style={styles.companyLine}>Website: {COMPANY.website}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invoice Form</Text>

          <Field
            label="Customer Name *"
            value={form.customerName}
            onChangeText={(v) => setForm((s) => ({ ...s, customerName: v }))}
            placeholder="Enter customer name"
          />
          <Field
            label="Address *"
            value={form.customerAddress}
            onChangeText={(v) => setForm((s) => ({ ...s, customerAddress: v }))}
            placeholder="Enter customer address"
          />
          <Field
            label="Post Code *"
            value={form.postCode}
            onChangeText={(v) => setForm((s) => ({ ...s, postCode: v.toUpperCase() }))}
            placeholder="e.g. SW1A 1AA"
          />
          <Field
            label="Job Description *"
            value={form.jobDescription}
            onChangeText={(v) => setForm((s) => ({ ...s, jobDescription: v }))}
            placeholder="e.g. Carpet cleaning (3 rooms), stain removal, sofa cleaning"
            multiline
            numberOfLines={3}
          />
          <Field
            label="Phone Number *"
            value={form.customerPhone}
            onChangeText={(v) => setForm((s) => ({ ...s, customerPhone: v }))}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />
          <Field
            label="Other Note (optional)"
            value={form.notes}
            onChangeText={(v) => setForm((s) => ({ ...s, notes: v }))}
            placeholder="Any notes or extra charges"
          />
          <Field
            label="Total Bill Amount (£) *"
            value={form.totalAmount}
            onChangeText={(v) => setForm((s) => ({ ...s, totalAmount: v.replace(/[^0-9.]/g, '') }))}
            placeholder="e.g. 120"
            keyboardType={Platform.select({ ios: 'decimal-pad', android: 'numeric' })}
          />

          <View style={styles.statusWrap}>
            <Text style={styles.statusLabel}>Payment Status</Text>
            <View style={styles.statusRow}>
              <Pressable
                onPress={() => setForm((s) => ({ ...s, paymentStatus: 'UNPAID' }))}
                style={({ pressed }) => [
                  styles.statusPill,
                  form.paymentStatus === 'UNPAID' ? styles.statusPillActiveUnpaid : styles.statusPillInactive,
                  pressed ? styles.statusPillPressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    form.paymentStatus === 'UNPAID' ? styles.statusPillTextActive : styles.statusPillTextInactive,
                  ]}
                >
                  Unpaid
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setForm((s) => ({ ...s, paymentStatus: 'PAID' }))}
                style={({ pressed }) => [
                  styles.statusPill,
                  form.paymentStatus === 'PAID' ? styles.statusPillActivePaid : styles.statusPillInactive,
                  pressed ? styles.statusPillPressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    form.paymentStatus === 'PAID' ? styles.statusPillTextActive : styles.statusPillTextInactive,
                  ]}
                >
                  Paid
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={onGenerate}
              style={({ pressed }) => [
                styles.primaryBtn,
                (!invoiceReady || busy) && styles.btnDisabled,
                pressed && invoiceReady && !busy ? styles.btnPressed : null,
              ]}
              disabled={!invoiceReady || busy}
            >
              <Text style={styles.primaryBtnText}>{busy ? 'Please wait…' : 'Generate Invoice'}</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (!meta) {
                  Alert.alert('Generate first', 'Please generate the invoice before sharing.');
                  return;
                }
                setShareVisible(true);
              }}
              style={({ pressed }) => [
                styles.secondaryBtn,
                (!meta || busy) && styles.btnDisabled,
                pressed && meta && !busy ? styles.btnPressedLight : null,
              ]}
              disabled={!meta || busy}
            >
              <Text style={styles.secondaryBtnText}>Share Invoice</Text>
            </Pressable>
          </View>
        </View>

        {meta ? (
          <View style={styles.card}>
            <View
              pointerEvents="none"
              style={[
                styles.previewStamp,
                form.paymentStatus === 'PAID' ? styles.previewStampPaid : styles.previewStampUnpaid,
              ]}
            >
              <Text
                style={[
                  styles.previewStampText,
                  form.paymentStatus === 'PAID' ? styles.previewStampTextPaid : styles.previewStampTextUnpaid,
                ]}
              >
                {form.paymentStatus === 'PAID' ? 'PAID' : 'UNPAID'}
              </Text>
            </View>

            <View style={styles.previewTop}>
              <Text style={styles.cardTitle}>Invoice Preview</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{meta.invoiceNo}</Text>
              </View>
            </View>

            <PreviewRow label="Date" value={meta.createdAt.toLocaleDateString('en-GB')} />
            <View style={styles.divider} />
            <PreviewRow label="Customer Name" value={form.customerName} />
            <PreviewRow label="Address" value={form.customerAddress} />
            <PreviewRow label="Post Code" value={form.postCode} />
            <PreviewRow label="Job Description" value={form.jobDescription} />
            <PreviewRow label="Phone Number" value={form.customerPhone} />
            <PreviewRow label="Other Note" value={form.notes} />
            <PreviewRow label="Payment Status" value={form.paymentStatus === 'PAID' ? 'Paid' : 'Unpaid'} />
            <View style={styles.divider} />
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total Bill Amount</Text>
              <Text style={styles.totalValue}>£{form.totalAmount}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={shareVisible} transparent animationType="fade" onRequestClose={() => setShareVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShareVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Share Invoice</Text>
            <Text style={styles.modalSub}>
              Choose how you want to share. We’ll generate a PDF and open your device share options.
            </Text>

            <Pressable
              onPress={shareViaGmail}
              style={({ pressed }) => [styles.modalBtn, pressed ? styles.modalBtnPressed : null]}
              disabled={busy}
            >
              <Text style={styles.modalBtnText}>Share via Gmail</Text>
            </Pressable>

            <Pressable
              onPress={shareViaWhatsApp}
              style={({ pressed }) => [styles.modalBtn, pressed ? styles.modalBtnPressed : null]}
              disabled={busy}
            >
              <Text style={styles.modalBtnText}>Share via WhatsApp</Text>
            </Pressable>

            <Pressable
              onPress={() => setShareVisible(false)}
              style={({ pressed }) => [styles.modalCancel, pressed ? styles.modalCancelPressed : null]}
              disabled={busy}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 28, gap: 12 },

  headerCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E7EEF8',
  },
  companyName: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  companyLine: { marginTop: 4, color: '#475569', fontSize: 12.5 },

  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E7EEF8',
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 10 },

  previewStamp: {
    position: 'absolute',
    top: 10,
    left: -26,
    transform: [{ rotate: '-18deg' }],
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 4,
    opacity: 0.18,
    zIndex: 1,
  },
  previewStampPaid: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
  previewStampUnpaid: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  previewStampText: { fontSize: 34, fontWeight: '900', letterSpacing: 2 },
  previewStampTextPaid: { color: '#065F46' },
  previewStampTextUnpaid: { color: '#991B1B' },

  fieldWrap: { marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#FAFBFF',
    color: '#0F172A',
  },

  statusWrap: { marginTop: 4, marginBottom: 10 },
  statusLabel: { fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 8 },
  statusRow: { flexDirection: 'row', gap: 10 },
  statusPill: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  statusPillInactive: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  statusPillActivePaid: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  statusPillActiveUnpaid: { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
  statusPillPressed: { opacity: 0.9 },
  statusPillText: { fontWeight: '900' },
  statusPillTextActive: { color: '#0F172A' },
  statusPillTextInactive: { color: '#334155' },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: 'white', fontWeight: '800' },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#E8EEF9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#0F172A', fontWeight: '800' },
  btnPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  btnPressedLight: { opacity: 0.9 },
  btnDisabled: { opacity: 0.5 },

  previewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { backgroundColor: '#EEF2FF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { color: '#3730A3', fontWeight: '800', fontSize: 12 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 6 },
  previewLabel: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  previewValue: { color: '#0F172A', fontSize: 12, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 },

  totalBox: { backgroundColor: '#0F172A', borderRadius: 14, padding: 12 },
  totalLabel: { color: 'white', opacity: 0.9, fontSize: 12, fontWeight: '700' },
  totalValue: { color: 'white', fontSize: 20, fontWeight: '900', marginTop: 6 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: { backgroundColor: 'white', width: '100%', maxWidth: 520, borderRadius: 16, padding: 14 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  modalSub: { marginTop: 6, color: '#475569', fontSize: 12.5, lineHeight: 18 },
  modalBtn: {
    marginTop: 12,
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnPressed: { opacity: 0.9 },
  modalBtnText: { color: 'white', fontWeight: '900' },
  modalCancel: { marginTop: 10, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  modalCancelPressed: { backgroundColor: '#F1F5F9' },
  modalCancelText: { color: '#0F172A', fontWeight: '800' },
});


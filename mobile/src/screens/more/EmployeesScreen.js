import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { employeeApi } from '../../api/services';
import { Avatar, Card, Button, Spinner, EmptyState, ScreenHeader, BottomModal, Input, PickerRow } from '../../components/UI';
import { colors, typography, spacing, radius } from '../../theme';

function EmployeeModal({ visible, onClose, businessId, employee }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(employee || { firstName: '', lastName: '', role: '', phone: '', salary: '', salaryFrequency: 'monthly' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const { mutate, isPending } = useMutation({
    mutationFn: () => employee ? employeeApi.update(businessId, employee._id, form) : employeeApi.create(businessId, { ...form, salary: Number(form.salary) }),
    onSuccess: () => { qc.invalidateQueries(['employees']); onClose(); },
    onError: (e) => Alert.alert('Error', e.response?.data?.message || 'Failed'),
  });
  return (
    <BottomModal visible={visible} onClose={onClose} title={employee ? 'Edit Employee' : 'Add Employee'} height="80%">
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}><Input label="First Name *" value={form.firstName} onChangeText={v => set('firstName', v)} /></View>
          <View style={{ flex: 1 }}><Input label="Last Name *" value={form.lastName} onChangeText={v => set('lastName', v)} /></View>
        </View>
        <Input label="Role / Position" value={form.role} onChangeText={v => set('role', v)} placeholder="e.g. Cashier, Driver" />
        <Input label="Phone" value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}><Input label="Salary (₦)" value={form.salary} onChangeText={v => set('salary', v)} keyboardType="numeric" /></View>
          <View style={{ flex: 1 }}>
            <PickerRow label="Frequency" value={form.salaryFrequency} options={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }]} onChange={v => set('salaryFrequency', v)} />
          </View>
        </View>
        <Button title={employee ? 'Update Employee' : 'Add Employee'} onPress={() => mutate()} loading={isPending} />
      </View>
    </BottomModal>
  );
}

export default function EmployeesScreen({ navigation }) {
  const { currentBusiness } = useAuthStore();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editEmp, setEditEmp] = useState(null);

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', currentBusiness?._id],
    queryFn: () => employeeApi.getAll(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
  });

  const { mutate: deleteE } = useMutation({
    mutationFn: (id) => employeeApi.delete(currentBusiness._id, id),
    onSuccess: () => qc.invalidateQueries(['employees']),
  });

  const totalSalary = employees?.reduce((a, e) => a + e.salary, 0) || 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Employees 👷" subtitle={`${employees?.length || 0} staff · ₦${totalSalary.toLocaleString()} payroll`} navigation={navigation} />
      {isLoading ? <Spinner /> : employees?.length === 0 ? (
        <EmptyState icon="👷" title="No Employees Yet" description="Add your staff to track salaries and attendance." action={<Button title="Add Employee" onPress={() => { setEditEmp(null); setShowModal(true); }} />} />
      ) : (
        <FlatList
          data={employees}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: spacing.lg, gap: 10, paddingBottom: 100 }}
          renderItem={({ item: e }) => (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar name={`${e.firstName} ${e.lastName}`} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: typography.base, fontWeight: '700', color: colors.text }}>{e.firstName} {e.lastName}</Text>
                  <Text style={{ fontSize: typography.sm, color: colors.textSecondary }}>{e.role || 'Staff'}</Text>
                  {e.phone ? <Text style={{ fontSize: typography.xs, color: colors.textMuted }}>📞 {e.phone}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ fontSize: typography.sm, fontWeight: '700', color: colors.primary }}>₦{e.salary.toLocaleString()}</Text>
                  <Text style={{ fontSize: typography.xs, color: colors.textMuted }}>{e.salaryFrequency}</Text>
                </View>
              </View>
              <View style={styles.empActions}>
                <TouchableOpacity style={styles.empBtn} onPress={() => { setEditEmp(e); setShowModal(true); }}>
                  <Text style={styles.empBtnText}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.empBtn, { borderColor: colors.dangerBg, backgroundColor: colors.dangerBg }]} onPress={() => Alert.alert('Remove', 'Remove this employee?', [{ text: 'Cancel' }, { text: 'Remove', style: 'destructive', onPress: () => deleteE(e._id) }])}>
                  <Text style={[styles.empBtnText, { color: colors.danger }]}>🗑️ Remove</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => { setEditEmp(null); setShowModal(true); }}>
        <Text style={{ fontSize: 28, color: colors.white, fontWeight: '300', lineHeight: 32 }}>+</Text>
      </TouchableOpacity>
      <EmployeeModal visible={showModal} onClose={() => { setShowModal(false); setEditEmp(null); }} businessId={currentBusiness?._id} employee={editEmp} />
    </View>
  );
}

const styles = StyleSheet.create({
  empActions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.gray100 },
  empBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.gray200, alignItems: 'center' },
  empBtnText: { fontSize: typography.sm, fontWeight: '600', color: colors.gray600 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
});

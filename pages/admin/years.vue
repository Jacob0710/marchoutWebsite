<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const { years } = useMockContent()
</script>

<template>
  <AdminAdminDataTable title="年度成果" description="年度主題、摘要與公開報告入口。">
    <thead class="bg-cloud text-left text-xs font-bold uppercase tracking-wide text-muted">
      <tr>
        <th class="px-5 py-3">年度</th>
        <th class="px-5 py-3">主題</th>
        <th class="px-5 py-3">摘要</th>
        <th class="px-5 py-3">公開頁</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-200">
      <tr v-for="year in years" :key="year.year">
        <td class="px-5 py-4 text-2xl font-bold text-coral">{{ year.year }}</td>
        <td class="px-5 py-4 font-semibold text-ink">{{ year.theme }}</td>
        <td class="max-w-xl px-5 py-4 text-sm leading-6 text-muted">{{ year.summary }}</td>
        <td class="px-5 py-4">
          <NuxtLink :to="`/years/${year.year}`" class="text-sm font-bold text-teal">查看</NuxtLink>
        </td>
      </tr>
    </tbody>
  </AdminAdminDataTable>
</template>

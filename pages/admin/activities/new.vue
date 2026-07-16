<script setup lang="ts">
import type { AdminActivity } from '~/types/adminActivity'
definePageMeta({ layout: 'admin' })
useSeo({ title: '新增活動', description: '建立活動草稿。' })
const saved = async (activity: AdminActivity) => navigateTo(`/admin/activities/${activity.id}/edit`)
</script>
<template><AdminActivityForm @saved="saved" /></template>

<script setup lang="ts">
const route = useRoute()
await navigateTo(`/admin/activities/${String(route.params.id)}/edit`, { redirectCode: 301 })
</script>
<template><span /></template>

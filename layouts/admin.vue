<script setup lang="ts">
const { status, loadAdmin } = useAdminAuth()

if (status.value === 'unknown') {
  await loadAdmin()
}
</script>

<template>
  <div class="min-h-screen bg-cloud text-ink lg:flex">
    <LayoutAdminSidebar />
    <div class="min-w-0 flex-1">
      <LayoutAdminHeader />
      <main class="px-4 py-6 sm:px-6 lg:px-8">
        <slot />
      </main>
    </div>
  </div>
</template>

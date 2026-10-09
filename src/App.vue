<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Layout from './shared/presentation/components/layout.vue';
import PvToast from 'primevue/toast';

const route = useRoute();
const hideShell = computed(() => route.meta.noShell === true);
</script>

<template>
  <PvToast />
  <router-view v-if="hideShell" />
  <Layout v-else />
</template>

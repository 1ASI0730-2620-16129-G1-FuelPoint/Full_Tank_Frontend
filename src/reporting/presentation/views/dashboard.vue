<script setup>
/**
 * Dashboard entry point. Acts as the segment home: renders the buyer or provider
 * dashboard depending on the active IAM session.
 */
import { computed } from 'vue';
import useIamStore from '../../../iam/application/iam.store.js';
import pinia from '../../../pinia.js';
import BuyerDashboard from './buyer-dashboard.vue';
import ProviderDashboard from './provider-dashboard.vue';

const iamStore = useIamStore(pinia);
const isProvider = computed(() => iamStore.isProvider);
</script>

<template>
  <ProviderDashboard v-if="isProvider"/>
  <BuyerDashboard v-else/>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import useIamStore from '../../../iam/application/iam.store.js';
import useNotificationStore from '../../../notification/application/notification.store.js';
import { setLocale } from '../../../i18n.js';
import pinia from '../../../pinia.js';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const iamStore = useIamStore(pinia);
const notificationStore = useNotificationStore(pinia);

const sidebarCollapsed = ref(false);

onMounted(async () => {
  if (iamStore.currentUserId) await iamStore.fetchCurrentUser();
  if (iamStore.isAuthenticated && !notificationStore.loaded) {
    await notificationStore.fetchNotifications();
  }
});

// ── Segment-aware navigation ────────────────────────────────────────────────
const buyerNav = [
  { key: 'dashboard',    icon: 'pi pi-home',        label: 'option.dashboard', to: '/dashboard', children: [] },
  { key: 'catalog',      icon: 'pi pi-shopping-bag', label: 'option.catalog',   to: '/catalog', children: [] },
  { key: 'equipment',    icon: 'pi pi-cog',         label: 'option.equipment', to: '/equipment', children: [] },
  { key: 'ordering',     icon: 'pi pi-shopping-cart', label: 'option.ordering', children: [
      { label: 'ordering.my-requests', to: '/ordering/my-requests' },
      { label: 'ordering.my-orders',   to: '/ordering/my-orders' },
  ]},
  { key: 'payment',      icon: 'pi pi-credit-card',  label: 'option.payment',   to: '/payment', children: [] },
  { key: 'notification', icon: 'pi pi-bell',         label: 'option.notifications', to: '/notification', children: [] },
  { key: 'reporting',    icon: 'pi pi-chart-bar',    label: 'option.reporting', to: '/reporting/buyer', children: [] },
];

const providerNav = [
  { key: 'dashboard',    icon: 'pi pi-home',  label: 'option.dashboard', to: '/dashboard', children: [] },
  { key: 'inventory',    icon: 'pi pi-box',   label: 'option.inventory', to: '/inventory/products', children: [] },
  { key: 'ordering',     icon: 'pi pi-shopping-cart', label: 'option.ordering', children: [
      { label: 'ordering.pending-requests', to: '/ordering/pending' },
      { label: 'ordering.orders',           to: '/ordering/orders' },
      { label: 'ordering.collections',      to: '/ordering/collections' },
  ]},
  { key: 'fulfillment',  icon: 'pi pi-truck', label: 'option.fulfillment', children: [
      { label: 'fulfillment.vehicles', to: '/fulfillment/vehicles' },
      { label: 'fulfillment.drivers',  to: '/fulfillment/drivers' },
  ]},
  { key: 'notification', icon: 'pi pi-bell',      label: 'option.notifications', to: '/notification', children: [] },
  { key: 'reporting',    icon: 'pi pi-chart-bar', label: 'option.reporting', to: '/reporting/provider', children: [] },
];

const navItems = computed(() => iamStore.isProvider ? providerNav : buyerNav);

const expanded = ref({});
function syncExpanded() {
  navItems.value.forEach(item => {
    if (expanded.value[item.key] === undefined) {
      expanded.value[item.key] = route.path.startsWith(`/${item.key}`);
    }
  });
}
syncExpanded();

const toggle = (key) => { expanded.value[key] = !expanded.value[key]; };

const isActive = (to) => {
  if (route.path === to) return true;
  const suffix = route.path.slice(to.length);
  return suffix.startsWith('/') && /^\/\d/.test(suffix);
};

// ── Identity & notifications ────────────────────────────────────────────────
const unreadCount = computed(() => {
  const list = iamStore.isProvider
    ? notificationStore.forProvider(iamStore.currentProviderId)
    : notificationStore.forBuyer(iamStore.currentCompanyId);
  return list.filter(n => !n.read).length;
});

const roleLabel = computed(() => iamStore.isProvider ? t('iam.provider-title') : t('iam.buyer-title'));
const initials = computed(() => (iamStore.displayName || 'FT').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase());

function changeLocale(newLocale) {
  setLocale(newLocale);
}

function logout() {
  iamStore.logout();
  router.push('/iam/login');
}
function goProfile() { router.push('/iam/profile'); }
function goNotifications() { router.push('/notification'); }
</script>

<template>
  <div class="shell">
    <!-- TOPBAR -->
    <header class="topbar">
      <div class="topbar-left">
        <button
            type="button"
            class="icon-btn"
            :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
            @click="sidebarCollapsed = !sidebarCollapsed"
        >
          <i class="pi pi-bars"/>
        </button>
        <img src="/fulltank-logo.png" alt="FullTank" class="brand-logo"/>
        <span class="brand-name">FullTank</span>
        <span class="segment-pill" :class="iamStore.isProvider ? 'provider' : 'buyer'">{{ roleLabel }}</span>
      </div>
      <div class="topbar-right">
        <div class="lang-switch" role="group" aria-label="Language switcher">
          <button
              type="button"
              class="lang-btn"
              :class="{ active: locale === 'en-US' || locale === 'en' }"
              :aria-pressed="locale === 'en-US' || locale === 'en'"
              @click="changeLocale('en-US')"
          >
            <i v-if="locale === 'en-US' || locale === 'en'" class="pi pi-check"/> EN
          </button>
          <button
              type="button"
              class="lang-btn"
              :class="{ active: locale === 'es-419' || locale === 'es' }"
              :aria-pressed="locale === 'es-419' || locale === 'es'"
              @click="changeLocale('es-419')"
          >
            <i v-if="locale === 'es-419' || locale === 'es'" class="pi pi-check"/> ES
          </button>
        </div>
        <button
            type="button"
            class="icon-btn bell"
            :aria-label="t('notification.title')"
            @click="goNotifications"
        >
          <i class="pi pi-bell"/>
          <span v-if="unreadCount" class="bell-badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
        </button>
        <div class="user-chip">
          <button type="button" class="user-trigger" :title="t('iam.profile-title')" :aria-label="t('iam.profile-title')" @click="goProfile">
            <div class="user-avatar">{{ initials }}</div>
            <div class="user-meta">
              <span class="user-name">{{ iamStore.displayName }}</span>
              <span class="user-role">{{ roleLabel }}</span>
            </div>
          </button>
          <button
              type="button"
              class="icon-btn"
              :title="t('iam.logout')"
              :aria-label="t('iam.logout')"
              @click.stop="logout"
          >
            <i class="pi pi-sign-out"/>
          </button>
        </div>
      </div>
    </header>

    <div class="body">
      <!-- SIDEBAR -->
      <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
        <nav aria-label="Sidebar navigation">
          <template v-for="item in navItems" :key="item.key">
            <router-link
                v-if="item.to && !item.children.length"
                :to="item.to"
                class="nav-item"
                :class="{ 'nav-item--active': route.path.startsWith('/' + item.key) }"
                style="text-decoration:none"
            >
              <i :class="item.icon"/>
              <span v-if="!sidebarCollapsed">{{ t(item.label) }}</span>
              <span v-if="item.key === 'notification' && unreadCount && !sidebarCollapsed" class="nav-badge">{{ unreadCount }}</span>
            </router-link>

            <template v-else>
              <button
                  type="button"
                  class="nav-item nav-toggle-btn"
                  :class="{ 'nav-item--active': route.path.startsWith('/' + item.key) }"
                  :aria-expanded="!!expanded[item.key]"
                  @click="toggle(item.key)"
              >
                <i :class="item.icon"/>
                <span v-if="!sidebarCollapsed">{{ t(item.label) }}</span>
                <i v-if="item.children.length && !sidebarCollapsed" class="pi chevron" :class="expanded[item.key] ? 'pi-chevron-up' : 'pi-chevron-down'"/>
              </button>
              <transition name="slide">
                <div v-if="expanded[item.key] && !sidebarCollapsed && item.children.length" class="sub-nav">
                  <router-link
                      v-for="child in item.children"
                      :key="child.to"
                      :to="child.to"
                      class="sub-item"
                      :class="{ 'sub-item--active': isActive(child.to) }"
                  >
                    {{ t(child.label) }}
                  </router-link>
                </div>
              </transition>
            </template>
          </template>
        </nav>

        <div v-if="!sidebarCollapsed" class="sidebar-footer">
          <button type="button" class="switch-btn" @click="logout">
            <i class="pi pi-sync"/> {{ t('iam.switch-segment') }}
          </button>
        </div>
      </aside>

      <!-- CONTENT WRAPPER -->
      <div class="content-col">
        <main class="main">
          <router-view/>
        </main>

        <!-- SEMANTIC FOOTER -->
        <footer class="app-footer">
          <div class="footer-left">
            <span>© 2026 FullTank. {{ t('footer.all-rights') }}</span>
            <span class="footer-dot">·</span>
            <router-link to="/terms" class="footer-link">{{ t('footer.terms') }}</router-link>
          </div>
          <div class="footer-right">
            <span class="simulation-tag"><i class="pi pi-info-circle"/> {{ t('footer.simulation-disclaimer') }}</span>
          </div>
        </footer>
      </div>
    </div>

    <pv-toast/>
    <pv-confirm-dialog/>
  </div>
</template>

<style scoped>
.shell { display: flex; flex-direction: column; min-height: 100vh; background: #F5F6F8; font-family: 'Inter', sans-serif; }

.topbar { height: 64px; background: #fff; border-bottom: 1px solid #E5E7EB; display: flex; align-items: center; justify-content: space-between; padding: 0 1.5rem; position: sticky; top: 0; z-index: 50; }
.topbar-left { display: flex; align-items: center; gap: .75rem; }
.brand-logo { height: 36px; object-fit: contain; }
.brand-name { font-size: 1.1rem; font-weight: 700; color: #1E3A8A; letter-spacing: -0.3px; }
.segment-pill { font-size: .72rem; font-weight: 700; padding: 3px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: .4px; }
.segment-pill.buyer { background: #e8f0fd; color: #2563eb; }
.segment-pill.provider { background: #e6f7f1; color: #059669; }

.topbar-right { display: flex; align-items: center; gap: 1rem; }
.lang-switch { display: flex; background: #EFF2F7; border-radius: 999px; padding: 4px; }
.lang-btn { border: none; background: transparent; padding: 6px 14px; border-radius: 999px; cursor: pointer; font-weight: 600; font-size: .85rem; color: #475569; display: flex; align-items: center; gap: 6px; }
.lang-btn.active { background: #fff; color: #1E3A8A; box-shadow: 0 1px 2px rgba(0,0,0,.08); }
.icon-btn { border: none; background: transparent; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; color: #475569; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; position: relative; }
.icon-btn:hover { background: #F3F4F6; }
.bell-badge { position: absolute; top: 2px; right: 2px; background: #dc2626; color: #fff; font-size: .62rem; font-weight: 700; border-radius: 999px; padding: 0 5px; min-width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; }

.user-chip { display: flex; align-items: center; gap: 8px; padding-left: 8px; border-left: 1px solid #eef2f7; }
.user-trigger { display: flex; align-items: center; gap: 8px; border: none; background: transparent; cursor: pointer; padding: 4px 6px; border-radius: 8px; transition: background .15s; }
.user-trigger:hover { background: #F3F4F6; }
.user-avatar { width: 34px; height: 34px; border-radius: 50%; background: #1e3a8a; color: #fff; font-weight: 700; font-size: .82rem; display: flex; align-items: center; justify-content: center; }
.user-meta { display: flex; flex-direction: column; line-height: 1.1; text-align: left; }
.user-name { font-size: .82rem; font-weight: 600; color: #1a2744; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-role { font-size: .7rem; color: #94a3b8; }

.body { display: flex; flex: 1; }
.sidebar { width: 240px; min-height: calc(100vh - 64px); background: #fff; border-right: 1px solid #E5E7EB; padding: 1rem 0; transition: width .2s; overflow: hidden; position: sticky; top: 64px; align-self: flex-start; height: calc(100vh - 64px); display: flex; flex-direction: column; }
.sidebar.collapsed { width: 56px; }
nav { flex: 1; }

.nav-item { display: flex; align-items: center; gap: .75rem; padding: .75rem 1.25rem; cursor: pointer; color: #374151; font-weight: 500; font-size: .95rem; transition: background .15s; }
.nav-toggle-btn { width: 100%; border: none; background: transparent; text-align: left; font-family: inherit; }
.nav-item:hover { background: #F8F9FB; }
.nav-item--active { color: #1E3A8A; font-weight: 600; }
.nav-item .chevron { margin-left: auto; font-size: .75rem; color: #94A3B8; }
.nav-badge { margin-left: auto; background: #dc2626; color: #fff; font-size: .68rem; font-weight: 700; border-radius: 999px; padding: 1px 7px; }

.sub-nav { display: flex; flex-direction: column; margin-left: 1rem; padding-left: 1.25rem; border-left: 2px solid #E5E7EB; }
.sub-item { padding: .5rem .75rem; color: #6B7280; font-size: .9rem; text-decoration: none; border-radius: 6px; margin: 2px 0; transition: background .15s, color .15s; }
.sub-item:hover { color: #1E3A8A; background: #F8F9FB; }
.sub-item--active { color: #F59E0B; font-weight: 600; background: #FEF3C7; }

.sidebar-footer { padding: 1rem 1.25rem; border-top: 1px solid #eef2f7; }
.switch-btn { width: 100%; border: 1px solid #e5e7eb; background: #fff; border-radius: 8px; padding: 8px; cursor: pointer; color: #475569; font-weight: 600; font-size: .82rem; display: flex; align-items: center; justify-content: center; gap: 6px; }
.switch-btn:hover { background: #f8fafc; color: #1e3a8a; }

.content-col { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.main { flex: 1; padding: 2rem 2.5rem; overflow-y: auto; }

.app-footer { background: #fff; border-top: 1px solid #E5E7EB; padding: 0.85rem 2.5rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: #64748b; margin-top: auto; }
.footer-left { display: flex; align-items: center; gap: 8px; }
.footer-dot { color: #cbd5e1; }
.footer-link { color: #1e3a8a; text-decoration: none; font-weight: 600; }
.footer-link:hover { text-decoration: underline; }
.simulation-tag { display: flex; align-items: center; gap: 6px; color: #94a3b8; }

.slide-enter-active, .slide-leave-active { transition: all .2s ease; overflow: hidden; }
.slide-enter-from, .slide-leave-to { max-height: 0; opacity: 0; }
.slide-enter-to, .slide-leave-from { max-height: 200px; opacity: 1; }
</style>

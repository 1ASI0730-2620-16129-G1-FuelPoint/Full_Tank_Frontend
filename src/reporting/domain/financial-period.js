/** Whether an order represents money that was actually paid. */
export function isPaidOrder(order) {
    return order?.paymentStatus === 'PAID' || order?.status === 'PAID' || order?.status === 'CLOSED';
}

/** Best available financial date for current and legacy demo orders. */
export function financialDate(order) {
    const value = order?.paidAt ?? order?.closedAt ?? order?.updatedAt ?? order?.createdAt;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/** Filters orders by optional year/month using their financial date. */
export function ordersInPeriod(orders, year, month = null) {
    return orders.filter(order => {
        const date = financialDate(order);
        if (!date || date.getFullYear() !== Number(year)) return false;
        return month == null || date.getMonth() === Number(month);
    });
}

/** Builds paid totals by day for one month. */
export function paidDailySeries(orders, year, month) {
    const days = new Date(Number(year), Number(month) + 1, 0).getDate();
    const totals = new Array(days).fill(0);
    orders.filter(isPaidOrder).forEach(order => {
        const date = financialDate(order);
        if (!date || date.getFullYear() !== Number(year) || date.getMonth() !== Number(month)) return;
        totals[date.getDate() - 1] += Number(order.totalAmount || 0);
    });
    return {
        labels: Array.from({ length: days }, (_, index) => String(index + 1)),
        values: totals,
    };
}

/** Builds paid totals by month for one year. */
export function paidMonthlySeries(orders, year) {
    const totals = new Array(12).fill(0);
    orders.filter(isPaidOrder).forEach(order => {
        const date = financialDate(order);
        if (!date || date.getFullYear() !== Number(year)) return;
        totals[date.getMonth()] += Number(order.totalAmount || 0);
    });
    return totals;
}

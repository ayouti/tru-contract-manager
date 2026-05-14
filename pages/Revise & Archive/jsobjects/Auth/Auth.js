export default {
	appId: "customer_contracts_archive", 

	init: async () => {
		// Fetch permissions from PostgreSQL first
		await get_user_permissions.run(); 
		const perms = Auth.getPermissions();

		// Optional: If you ever want to block users completely from this app if they aren't in the DB
		if (perms.length === 0) {
			navigateTo('RESTRICTED', {}, 'SAME_WINDOW');
			return false;
		}
	},

	getPermissions: () => {
		const data = get_user_permissions.data;
		if (!data || data.length === 0) return [];
		return data[0].permissions || [];
	},
}
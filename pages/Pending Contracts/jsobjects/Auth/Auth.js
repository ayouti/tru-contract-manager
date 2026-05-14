export default {
	appId: "customer_contracts_pending", 

	init: async () => {
		const queryResult = await get_user_permissions.run(); 
		let perms = [];
		if (queryResult && queryResult.length > 0 && queryResult[0].permissions) {
			perms = queryResult[0].permissions;
		}

		// 3. Optional: Block user completely from this app
		if (perms.length === 0) {
			navigateTo('RESTRICTED', {}, 'SAME_WINDOW');
		}
	},

	getPermissions: () => {
		const data = get_user_permissions.data;
		if (!data || data.length === 0) return [];
		return data[0].permissions || [];
	},

	isSupervisor: () => {
		return Auth.getPermissions().includes('supervisor');
	}
}
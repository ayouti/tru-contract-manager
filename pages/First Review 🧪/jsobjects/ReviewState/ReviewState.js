export default {
	currentContract: null,
	rawDiscrepancies: [],
	selectedIssues: [],
	progress: { completed: 0, target: 0 },

	async init() {
		await fetch_discrepancies.run();
		this.rawDiscrepancies = fetch_discrepancies.data || [];
		await this.refreshProgress();
	},

	async refreshProgress() {
		const res = await get_progress.run();
		if (res && res.length > 0) {
			this.progress = {
				completed: res[0].completed || 0,
				target: res[0].target || 0
			};
		}
	},

	async handleMainAction() {
		if (this.currentContract) {
			// We are SUBMITTING
			if (!chk_noDiscrepancies.isChecked && this.selectedIssues.length === 0) {
				showAlert('Please select discrepancies or check "No discrepancies found".', 'error');
				return;
			}
			await submit_review.run();
			showAlert('Review submitted successfully!', 'success');

			// Clear current state
			this.currentContract = null;
			this.selectedIssues = [];
			resetWidget('chk_noDiscrepancies', true);
			resetWidget('select_category', true);
			resetWidget('select_subcategory', true);
			await this.refreshProgress();
		}

		// Fetch Next Contract
		const res = await get_next_contract.run();
		if (res && res.length > 0) {
			this.currentContract = res[0];
			navigateTo('https://trufinance.app/dash/loans/loanapplication/' + res[0].loan_application_id + '/change/?_changelist_filters=q%3D' + res[0].loan_application_id, {}, 'NEW_WINDOW');
			showAlert('Contract loaded.', 'info');
		} else {
			showAlert('Queue is empty! No pending contracts right now.', 'warning');
		}
	},

	toggleIssue(issueObj) {
		const existsIndex = this.selectedIssues.findIndex(i =>
																											i.category === issueObj.category &&
																											i.subcategory === issueObj.subcategory &&
																											i.issue === issueObj.issue
																										 );

		if (existsIndex > -1) {
			// Remove it
			this.selectedIssues.splice(existsIndex, 1);
		} else {
			// Add it
			this.selectedIssues.push(issueObj);
			// Auto-uncheck the "No discrepancies" box if it was checked
			if (chk_noDiscrepancies.isChecked) {
				resetWidget('chk_noDiscrepancies', true);
			}
		}
	},

	getSubcategories() {
		if (!select_category.selectedOptionValue) return [];
		const filtered = this.rawDiscrepancies.filter(item => item.category === select_category.selectedOptionValue);
		const subs = [...new Set(filtered.map(item => item.subcategory))];
		return subs.map(s => ({ label: s, value: s }));
	},

	getIssuesForList() {
		if (!select_category.selectedOptionValue || !select_subcategory.selectedOptionValue) return [];
		return this.rawDiscrepancies.filter(item =>
																				item.category === select_category.selectedOptionValue &&
																				item.subcategory === select_subcategory.selectedOptionValue
																			 );
	}
}

export default {
	currentContract: null,
	rawDiscrepancies: [],
	selectedIssues: [],
	progress: { completed: 0, target: 0 },
	isEditing: false,
	chkNoDiscrepanciesDefault: false, // Tracks dynamic checkbox state

	init: async () => {
		await fetch_discrepancies.run();
		ReviewState.rawDiscrepancies = fetch_discrepancies.data || [];
	},

	async handleMainAction() {
		// Case: Manual fetch when form is completely empty
		if (!this.currentContract) {
			const res = await get_next_contract.run();
			if (res && res.length > 0) {
				this.currentContract = res[0];
				showAlert('Contract loaded.', 'info');
			} else {
				showAlert('Queue is empty! No pending contracts right now.', 'warning');
			}
			return;
		}

		// Validation Guard
		if (!chk_noDiscrepancies.isChecked && this.selectedIssues.length === 0) {
			showAlert('Please select discrepancies or check "No discrepancies found".', 'error');
			return;
		}

		// Execute submission/resubmission
		await submit_review.run();
		await get_submissions.run();
		showAlert(this.isEditing ? 'Changes saved successfully!' : 'Review submitted successfully!', 'success');

		// Reset working states
		this.selectedIssues = [];
		this.isEditing = false;
		this.chkNoDiscrepanciesDefault = false;

		resetWidget('chk_noDiscrepancies', true);
		resetWidget('select_category', true);
		resetWidget('select_subcategory', true);

		// Chain next contract pickup (Handles Point 3, 4, and 7)
		const res = await get_next_contract.run();
		if (res && res.length > 0) {
			this.currentContract = res[0];
		} else {
			this.currentContract = null; // Explicitly clears card display area
			showAlert('Queue is empty! No more pending contracts available.', 'warning');
		}
		await this.refreshProgress();
	},

	async startEditing(row) {
		// If an active unsubmitted queue item is open, release it back to pool
		if (this.currentContract && !this.isEditing) {
			await unlock_current_contract.run();
		}

		this.currentContract = row;
		this.selectedIssues = row.first_review_discrepancies || [];
		this.isEditing = true;

		// Check box only if old contract was submitted with clean records
		this.chkNoDiscrepanciesDefault = (this.selectedIssues.length === 0);

		closeModal(modal_history.name);
		resetWidget('chk_noDiscrepancies', true);
		resetWidget('select_category', true);
		resetWidget('select_subcategory', true);
	},

	cancelEditing() {
		this.clearReviewState();
		showAlert('Editing cancelled.', 'info');
	},

	clearReviewState() {
		this.currentContract = null;
		this.selectedIssues = [];
		this.isEditing = false;
		this.chkNoDiscrepanciesDefault = false;
		resetWidget('chk_noDiscrepancies', true);
		resetWidget('select_category', true);
		resetWidget('select_subcategory', true);
	},

	toggleIssue(issueObj) {
		const existsIndex = this.selectedIssues.findIndex(i =>
																											i.category === issueObj.category &&
																											i.subcategory === issueObj.subcategory &&
																											i.issue === issueObj.issue
																										 );

		if (existsIndex > -1) {
			this.selectedIssues.splice(existsIndex, 1);
		} else {
			this.selectedIssues.push(issueObj);
			if (chk_noDiscrepancies.isChecked) {
				this.chkNoDiscrepanciesDefault = false;
				resetWidget('chk_noDiscrepancies', true);
			}
		}
	},

	getCategories() {
		const cats = [...new Set(this.rawDiscrepancies.map(item => item.category))];
		return cats.filter(Boolean).map(c => ({ label: c, value: c }));
	},

	getSubcategories() {
		if (!select_category.selectedOptionValue) return [];
		const filtered = this.rawDiscrepancies.filter(item => item.category === select_category.selectedOptionValue);
		const subs = [...new Set(filtered.map(item => item.subcategory))];
		return subs.filter(Boolean).map(s => ({ label: s, value: s }));
	},

	getIssuesForList: () => {
		const cat = select_category.selectedOptionValue;
		const sub = select_subcategory.selectedOptionValue;

		return ReviewState.rawDiscrepancies.filter(item => item.category === cat && item.subcategory === sub);
	}
}

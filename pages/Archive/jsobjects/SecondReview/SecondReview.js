export default {
	currentContract: null,
	rawDiscrepancies: [],
	selectedIssues: [],

	async init() {
		if (this.rawDiscrepancies.length === 0) {
			await fetch_discrepancies.run();
			const data = fetch_discrepancies.data;
			if (Array.isArray(data)) {
				this.rawDiscrepancies = data.map(item => ({
					category: String(item.category || item.Category || '').trim(),
					subcategory: String(item.subcategory || item.Subcategory || '').trim(),
					issue: String(item.issue || item.Issue || '').trim(),
					severity: String(item.severity || item.Severity || '').trim()
				}));
			}
		}
	},

	async handleRevise(row) {
		await this.init();
		this.currentContract = row;
		// Load existing 2nd review discrepancies if revising again, otherwise empty
		this.selectedIssues = row.second_review_discrepancies || [];

		showModal(modal_secondReview.name);
		resetWidget('chk_2ndNoDiscrepancies', true);
		resetWidget('select_2ndCategory', true);
		resetWidget('select_2ndSubcategory', true);
	},

	async saveReview() {
		if (!chk_2ndNoDiscrepancies.isChecked && this.selectedIssues.length === 0) {
			showAlert('Please select discrepancies or check "No discrepancies found".', 'error');
			return;
		}

		await submit_second_review.run({
			loan_application_id: this.currentContract.loan_application_id,
			discrepancies: JSON.stringify(this.selectedIssues)
		});

		showAlert('Second review saved.', 'success');
		closeModal(modal_secondReview.name);
		this.currentContract = null;
		
		// Replace 'get_slave_table_query' with the actual query that populates your Archive slave table
		await get_slave_table_query.run(); 
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
			if (chk_2ndNoDiscrepancies.isChecked) resetWidget('chk_2ndNoDiscrepancies', true);
		}
	},

	getCategories() {
		const cats = [...new Set(this.rawDiscrepancies.map(item => item.category))];
		return cats.filter(Boolean).map(c => ({ label: c, value: c }));
	},

	getSubcategories() {
		const cat = select_2ndCategory.selectedOptionValue;
		if (!cat) return [];
		const filtered = this.rawDiscrepancies.filter(item => item.category === cat);
		const subs = [...new Set(filtered.map(item => item.subcategory))];
		return subs.filter(Boolean).map(s => ({ label: s, value: s }));
	},

	getIssuesForList() {
		const cat = select_2ndCategory.selectedOptionValue;
		const sub = select_2ndSubcategory.selectedOptionValue;
		if (!cat || !sub) return [];
		return this.rawDiscrepancies.filter(item =>
			item.category.toLowerCase() === String(cat).trim().toLowerCase() &&
			item.subcategory.toLowerCase() === String(sub).trim().toLowerCase()
		);
	}
}
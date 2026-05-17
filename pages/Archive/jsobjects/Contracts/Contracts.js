export default {
	async reviseContract (loanId, nationalId) {
		navigateTo('https://trufinance.app/dash/loans/loanapplication/' + loanId + '/change/?_changelist_filters=q%3D' + loanId, {}, 'NEW_WINDOW');
		navigateTo('https://trufinance.app/dash/loans/pndashboard/?q=' + nationalId, {}, 'NEW_WINDOW');
	}
}
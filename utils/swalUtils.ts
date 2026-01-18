import Swal, { SweetAlertOptions } from 'sweetalert2';

/**
 * XEENAPS PREMIUM SWEETALERT2 CONFIGURATION
 * Standardized UI with primary brand colors, English text, and elegant spacing.
 */
export const XEENAPS_SWAL_CONFIG = {
  customClass: {
    popup: 'rounded-[2.5rem] border-none shadow-2xl p-8 md:p-10',
    title: 'text-[#004A74] font-black text-xl md:text-2xl pb-4 mb-4 border-b border-[#004A74]/20 w-full',
    htmlContainer: 'text-gray-500 font-medium text-sm md:text-base mt-0',
    confirmButton: 'bg-[#004A74] text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-[#003859] transition-all border-none outline-none focus:ring-4 focus:ring-[#004A74]/20 mx-2 mt-4',
    cancelButton: 'bg-gray-100 text-gray-400 px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-all border-none outline-none mx-2 mt-4'
  },
  buttonsStyling: false,
};

/**
 * Standard Alert Helper
 */
export const showXeenapsAlert = (options: SweetAlertOptions) => {
  return Swal.fire({
    ...XEENAPS_SWAL_CONFIG,
    ...options
  });
};

/**
 * Standard Confirmation Helper
 */
export const showXeenapsConfirm = (title: string, text: string, confirmText: string = 'PROCEED') => {
  return Swal.fire({
    ...XEENAPS_SWAL_CONFIG,
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'CANCEL'
  });
};

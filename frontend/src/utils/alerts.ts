import Swal from "sweetalert2";

export async function showSuccessAlert(message: string) {
  return Swal.fire({
    icon: "success",
    title: message,
    timer: 1700,
    showConfirmButton: false,
    background: "#fffdf7",
    backdrop: "rgba(62, 61, 53, 0.45)",
    customClass: {
      popup: "otm-swal-popup",
      icon: "otm-swal-icon otm-swal-icon-success",
      title: "otm-swal-title otm-swal-title-success",
    },
    showClass: {
      popup: "swal2-show otm-swal-show",
      backdrop: "swal2-backdrop-show",
      icon: "swal2-icon-show",
    },
    hideClass: {
      popup: "swal2-hide otm-swal-hide",
      backdrop: "swal2-backdrop-hide",
      icon: "swal2-icon-hide",
    },
  });
}

export async function showErrorAlert(message: string) {
  return Swal.fire({
    icon: "error",
    title: "Error",
    text: message,
    confirmButtonText: "OK",
    buttonsStyling: false,
    background: "#fffdf7",
    backdrop: "rgba(62, 61, 53, 0.45)",
    customClass: {
      popup: "otm-swal-popup",
      icon: "otm-swal-icon otm-swal-icon-danger",
      title: "otm-swal-title otm-swal-title-danger",
      confirmButton: "otm-swal-confirm otm-swal-confirm-danger",
    },
  });
}

export async function showWarningAlert(message: string) {
  return Swal.fire({
    icon: "warning",
    title: message,
    showConfirmButton: true,
    confirmButtonText: "OK",
    buttonsStyling: false,
    timer: 2000,
    timerProgressBar: true,
    background: "#fffdf7",
    backdrop: "rgba(62, 61, 53, 0.45)",
    customClass: {
      popup: "otm-swal-popup",
      icon: "otm-swal-icon otm-swal-icon-danger",
      title: "otm-swal-title otm-swal-title-danger",
      confirmButton: "otm-swal-confirm otm-swal-confirm-danger",
    },
  });
}

export async function showConfirmAlert(message: string) {
  const result = await Swal.fire({
    icon: "warning",
    title: "Please Confirm",
    text: message,
    showCancelButton: true,
    confirmButtonText: "Yes",
    cancelButtonText: "Cancel",
    buttonsStyling: false,
    background: "#fffdf7",
    backdrop: "rgba(62, 61, 53, 0.45)",
    customClass: {
      popup: "otm-swal-popup",
      icon: "otm-swal-icon otm-swal-icon-danger",
      title: "otm-swal-title otm-swal-title-danger",
      confirmButton: "otm-swal-confirm otm-swal-confirm-danger",
      cancelButton: "otm-swal-cancel",
    },
  });

  return result.isConfirmed;
}

import { z } from "zod";

/**
 * Override Zod's default English error messages with Vietnamese.
 * Imported for side effects at app boot — see app.ts.
 *
 * Per-schema messages (passed as the second arg of validators like
 * z.string().min(6, "Mật khẩu tối thiểu 6 ký tự")) always win over this map.
 */
z.config({
  customError: (issue) => {
    switch (issue.code) {
      case "invalid_type": {
        const got = issue.input === undefined ? "trống" : typeof issue.input;
        const expected = String(issue.expected);
        return `Trường này phải là ${vnType(expected)} (đang là ${got})`;
      }
      case "too_small": {
        if (issue.origin === "string") {
          return issue.minimum === 1
            ? "Trường này không được để trống"
            : `Tối thiểu ${issue.minimum} ký tự`;
        }
        if (issue.origin === "number") return `Phải lớn hơn hoặc bằng ${issue.minimum}`;
        if (issue.origin === "array") return `Cần ít nhất ${issue.minimum} phần tử`;
        return `Giá trị quá nhỏ (tối thiểu ${issue.minimum})`;
      }
      case "too_big": {
        if (issue.origin === "string") return `Tối đa ${issue.maximum} ký tự`;
        if (issue.origin === "number") return `Phải nhỏ hơn hoặc bằng ${issue.maximum}`;
        if (issue.origin === "array") return `Tối đa ${issue.maximum} phần tử`;
        return `Giá trị quá lớn (tối đa ${issue.maximum})`;
      }
      case "invalid_format": {
        const format = (issue as { format?: string }).format;
        if (format === "email") return "Email không hợp lệ";
        if (format === "url") return "Đường dẫn không hợp lệ";
        if (format === "uuid") return "UUID không hợp lệ";
        if (format === "datetime") return "Định dạng thời gian không hợp lệ";
        return "Định dạng không hợp lệ";
      }
      case "invalid_value":
        return "Giá trị không hợp lệ";
      case "unrecognized_keys":
        return "Có trường không được phép";
      case "invalid_union":
        return "Dữ liệu không khớp với bất kỳ định dạng nào được chấp nhận";
      case "not_multiple_of":
        return `Phải là bội số của ${(issue as { divisor?: number }).divisor}`;
      default:
        return undefined; // fall back to Zod's default
    }
  },
});

function vnType(expected: string): string {
  switch (expected) {
    case "string":
      return "chuỗi";
    case "number":
      return "số";
    case "boolean":
      return "đúng/sai";
    case "array":
      return "danh sách";
    case "object":
      return "đối tượng";
    case "date":
      return "ngày";
    default:
      return expected;
  }
}

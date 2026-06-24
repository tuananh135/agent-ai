# Spec phát triển theo phase — AI Agent BĐS (demo)

Stack: **Next.js 14 (App Router) + TypeScript + Vercel AI SDK (`ai` + `@ai-sdk/anthropic`)**.
Lưu trữ demo: **in-memory store** (singleton, sống qua HMR), realtime bằng **SSE**. Không cần DB ngoài.
Model: `claude-opus-4-8` (đánh giá EF4 + escalation), `claude-sonnet-4-6` (hội thoại, báo cáo).
Ngôn ngữ với khách: **tiếng Pháp**. Giao diện sản phẩm: tiếng Pháp. Tài liệu/comment: tiếng Việt.

Nguyên tắc xuyên suốt:
- Logic nghiệp vụ tách khỏi nguồn input (mọi yêu cầu vào qua `InboundRequest` chuẩn hóa).
- **State machine của lead do code quản**, không để LLM tự quản.
- Mỗi hành động nghiệp vụ = **một tool** (function calling). LLM quyết định *gọi tool nào*; code quyết định *tool làm gì* và *trạng thái đổi ra sao*.
- EF4 dùng **structured output** (Zod schema) để kết quả đánh giá đáng tin.

---

## Phase 0 — Scaffolding & nền tảng
**Mục tiêu:** dự án chạy được `npm run dev`, có model layer, store, types, seed.
**Sản phẩm:**
- `package.json`, `tsconfig.json`, `next.config.mjs`, `app/layout.tsx`, `globals.css`.
- `lib/types.ts` — mô hình dữ liệu (mục 8 đặc tả): Lead, LeadCriteria, QualificationCriteria, Evaluation, Message, Appointment, Slot, Property, Report, Escalation.
- `lib/store.ts` — in-memory store + `EventEmitter` (phát sự kiện cho EF9).
- `lib/model.ts` — chọn model.
- `lib/seed.ts` — danh mục BĐS, lịch trống, bộ tiêu chí mặc định (giả lập).
**Nghiệm thu:** `npm run dev` mở được, `/api/seed` nạp dữ liệu, `/api/events` phát SSE.

## Phase 1 — Tiếp nhận & state machine (EF1)
**Mục tiêu:** một `InboundRequest` chuẩn hóa tạo đúng một lead trạng thái `new`, gắn BĐS quan tâm nếu có, lưu mọi tin nhắn.
**Sản phẩm:** `app/api/inbound/route.ts`, hằng số trạng thái + hàm chuyển trạng thái trong `store.ts`.
**Nghiệm thu:** POST `/api/inbound` → 1 lead mới + sự kiện `lead.created`; trao đổi lưu gắn lead.

## Phase 2 — Tầng tool (nghiệp vụ)
**Mục tiêu:** toàn bộ công cụ agent dùng, mỗi tool tự cập nhật store + phát sự kiện.
**Sản phẩm:** `lib/agents/tools.ts`, `lib/agents/schemas.ts`.
- Tool khách: `update_lead_info`, `get_qualification_criteria`, `evaluate_lead`, `search_properties`, `get_property`, `get_available_slots`, `book_appointment`, `escalate`.
- Tool môi giới: `set_criteria`, `get_criteria`, `list_leads`, `get_lead_summary`, `get_shortlist`, `list_escalations`.
**Nghiệm thu:** gọi từng tool độc lập cho kết quả đúng; `book_appointment` không cho 2 lead trùng slot.

## Phase 3 — Agent khách: xác định nhu cầu & tư vấn (EF3, EF5)
**Mục tiêu:** agent (system prompt tiếng Pháp) thu thập thông tin, phân biệt 2 trường hợp (đã có BĐS cụ thể / còn mông lung), tư vấn từ danh mục đã đăng, không bịa.
**Sản phẩm:** `lib/agents/clientAgent.ts`, `app/api/chat/route.ts`.
**Nghiệm thu:** agent đi đúng luồng từng trường hợp; chỉ đề xuất 1–3 căn từ danh mục; không có kết quả thì xử lý rõ ràng.

## Phase 4 — Đánh giá & xếp ưu tiên (EF4)
**Mục tiêu:** so khớp khách với bộ tiêu chí + đánh giá độ nghiêm túc, ra `pass/fail/incomplete` + priority + lý do, bằng structured output.
**Sản phẩm:** `lib/agents/evaluate.ts` (dùng `generateObject` + Zod). Tool `evaluate_lead` gọi vào đây và cập nhật trạng thái lead.
**Nghiệm thu:** kết luận đúng tiêu chí; mỗi lead có priority + lý do xem được trong báo cáo.

## Phase 5 — Đặt lịch tự động (EF6)
**Mục tiêu:** khi lead `qualified`, agent đề xuất khung trống và đặt; khóa slot; xác nhận khách; chuyển `booked`.
**Sản phẩm:** tool `get_available_slots` + `book_appointment` (Phase 2) + nhánh trong clientAgent.
**Nghiệm thu:** 2 khách không đặt cùng slot; khách nhận xác nhận; lịch xuất hiện ở monitor.

## Phase 6 — Agent môi giới: tiêu chí & báo cáo (EF2, EF7)
**Mục tiêu:** môi giới đặt/sửa tiêu chí bằng NL; agent báo cáo (danh sách rút gọn theo BĐS, sự kiện đặt lịch, không đạt, truy vấn theo trạng thái).
**Sản phẩm:** `lib/agents/brokerAgent.ts`, `app/api/broker/route.ts`.
**Nghiệm thu:** đặt/sửa/xem tiêu chí qua hội thoại; lead sau đó đánh giá theo tiêu chí mới nhất; truy vấn trả dữ liệu đúng.

## Phase 7 — Escalation kèm bản nháp (EF8)
**Mục tiêu:** khi gặp việc không xử lý được, agent gửi khách tin giữ nhịp, tạo escalation kèm bối cảnh + bản nháp trả lời; lead `pending_human`.
**Sản phẩm:** tool `escalate`, hiển thị ở monitor.
**Nghiệm thu:** mỗi escalation có bối cảnh + bản nháp hợp lý; khách không bị bỏ lửng.

## Phase 8 — Màn giám sát realtime (EF9)
**Mục tiêu:** dashboard chỉ đọc: danh sách lead + trạng thái + kết quả đánh giá; hội thoại lead đang chọn (cập nhật trực tiếp); lịch hẹn & slot trống; escalation đang chờ. Có khung chat khách + chat môi giới để demo.
**Sản phẩm:** `app/monitor/page.tsx`, `app/api/events/route.ts` (SSE).
**Nghiệm thu:** tin/lịch/escalation mới hiện không cần reload.

## Phase 9 — Hoàn thiện & kịch bản
**Mục tiêu:** chạy mượt kịch bản A–E, prompt tiếng Pháp chỉn chu, chống bịa, xử lý lỗi không sập, nút seed/reset.
**Sản phẩm:** `app/api/seed/route.ts` (gồm kịch bản E: 1 căn nhiều yêu cầu), README hướng dẫn demo.
**Nghiệm thu:** trình diễn được cả 5 kịch bản; danh sách rút gọn cho thấy giá trị lọc hồ sơ.

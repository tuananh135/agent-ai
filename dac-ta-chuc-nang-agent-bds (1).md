# Đặc tả chức năng: AI Agent trợ lý cho công ty môi giới bất động sản

Tài liệu dành cho đội phát triển. Phạm vi: bản demo / proof of concept. Thị trường mục tiêu: Pháp.

Phiên bản 1.1

---

## 1. Bối cảnh và mục tiêu

Mục tiêu là xây dựng một AI agent hoạt động như một trợ lý thật cho công ty môi giới bất động sản. Khi một yêu cầu từ khách hàng tiềm năng đến, agent thay con người làm các việc: xác định nhu cầu của khách, kiểm tra xem khách có đạt bộ tiêu chí do công ty đặt ra hay không, tự đặt lịch hẹn nếu mọi thứ ổn, báo cáo lại cho môi giới viên, và chuyển tiếp lên con người (kèm sẵn bản nháp trả lời) khi gặp điều không xử lý được.

Điểm cốt lõi: agent phải vận hành được như một trợ lý thật ngoài đời. Nó không chỉ trả lời máy móc, mà tự đánh giá và tự quyết định trong khuôn khổ được giao, đồng thời biết khi nào phải chuyển việc lại cho con người.

Giá trị quan trọng nhất: lọc hồ sơ để tiết kiệm thời gian cho môi giới viên. Một căn nhà có thể nhận tới 15 yêu cầu hỏi, nhưng thường chỉ 1 đến 2 người thật sự đủ điều kiện và nghiêm túc. Agent gánh phần sàng lọc khối lượng lớn này và chỉ đưa lên cho môi giới viên những hồ sơ đáng để họ dành thời gian.

Bản demo cần chứng minh:
1. Từ nhiều yêu cầu cho một căn nhà, agent lọc ra danh sách ngắn các hồ sơ đủ điều kiện và nghiêm túc, xếp theo ưu tiên.
2. Khi một yêu cầu vào, agent tự xác định nhu cầu và đánh giá khách theo bộ tiêu chí mà con người đã thiết lập.
3. Nếu khách đạt tiêu chí, agent tự đặt lịch hẹn và báo cáo lại cho môi giới viên.
4. Nếu có điều không trả lời được, agent chuyển tiếp lên con người kèm một bản nháp trả lời để con người duyệt.

---

## 2. Phạm vi

### Nằm trong demo

- Tiếp nhận một yêu cầu đến (đã được chuẩn hóa) và xử lý nó.
- Cho phép môi giới viên thiết lập và chỉnh sửa bộ tiêu chí đủ điều kiện.
- Xác định nhu cầu và thu thập thông tin của khách.
- Đánh giá khách theo bộ tiêu chí và đưa ra kết luận (đạt / không đạt / thiếu thông tin).
- Trả lời câu hỏi của khách về bất động sản.
- Tự đặt lịch hẹn khi khách đạt tiêu chí.
- Báo cáo cho môi giới viên.
- Chuyển tiếp lên con người kèm bản nháp trả lời.
- Màn hình giám sát chỉ đọc (tùy chọn).

### Ngoài phạm vi (xử lý sau)

- Kết nối các nguồn yêu cầu thật (form web, email, SMS, cổng như SeLoger, ghi chú cuộc gọi). Trong demo, các nguồn này được mô phỏng bằng một yêu cầu đã chuẩn hóa.
- Tích hợp CRM, lịch thật, danh mục bất động sản thật.
- Thanh toán, ký điện tử, quản lý tài liệu.
- Đa chi nhánh, phân quyền phức tạp.

---

## 3. Các tác nhân

| Tác nhân | Vai trò |
|---|---|
| Khách hàng tiềm năng | Người liên hệ công ty cho một dự án bất động sản (thường đã có sẵn tiêu chí và một bất động sản quan tâm). Tương tác bằng ngôn ngữ tự nhiên. |
| Môi giới viên (con người) | Người dùng của công ty. Thiết lập bộ tiêu chí, nhận báo cáo, và xử lý các trường hợp được chuyển tiếp. Được nhận diện duy nhất. |
| AI Agent | Hệ thống. Đóng hai vai trò: trợ lý kinh doanh với khách, trợ lý cá nhân với môi giới viên. |

---

## 4. Tổng quan vận hành

Luồng chính khi một yêu cầu đến:

1. Yêu cầu vào hệ thống (từ bất kỳ nguồn nào, đã chuẩn hóa).
2. Agent xác định nhu cầu và thu thập thông tin còn thiếu qua hội thoại.
3. Agent đánh giá khách theo bộ tiêu chí do môi giới viên thiết lập.
4. Nếu đạt: agent đề xuất và đặt lịch hẹn, rồi báo cáo cho môi giới viên.
5. Nếu không đạt: agent xử lý theo quy định (thông báo lịch sự, thu thập thêm, hoặc đánh dấu để con người xem lại) và báo cáo.
6. Nếu gặp điều không xử lý được: agent chuyển tiếp lên môi giới viên kèm một bản nháp trả lời.

Agent có hai vai trò song song: trợ lý kinh doanh với khách (xác định nhu cầu, đánh giá, đặt lịch) và trợ lý cá nhân với môi giới viên (nhận thiết lập tiêu chí, gửi báo cáo, xử lý escalation, trả lời truy vấn về hoạt động).

---

## 5. Nguồn yêu cầu đến

Trong thực tế, khách thường xuất phát từ một tin đăng trên SeLoger hoặc web của công ty. Họ đã có sẵn tiêu chí, xem một bất động sản, rồi liên hệ qua điện thoại, form, tin nhắn hoặc email.

Với demo, phần kết nối các nguồn này được để lại xử lý sau. Demo coi mọi yêu cầu là một "yêu cầu đến đã chuẩn hóa" gồm: thông tin khách (nếu có), bất động sản quan tâm (nếu có), và nội dung yêu cầu. Kiến trúc phải tách logic nghiệp vụ khỏi nguồn đầu vào, để sau này cắm thêm kênh mà không phải viết lại phần lõi.

---

## 6. Yêu cầu chức năng

Mỗi yêu cầu có mã định danh (EF), mô tả, quy tắc, và tiêu chí nghiệm thu.

### EF1: Tiếp nhận và chuẩn hóa yêu cầu đến

Mô tả: hệ thống nhận một yêu cầu đến và tạo (hoặc gắn vào) một hồ sơ lead.

Quy tắc:
- Mỗi yêu cầu mới tạo một lead với trạng thái "mới", kèm bất động sản quan tâm nếu có.
- Nguồn của yêu cầu được ghi lại (form, email, v.v.) dù phần kết nối thật để xử lý sau.

Tiêu chí nghiệm thu:
- Một yêu cầu đến tạo đúng một hồ sơ lead và khởi động luồng xử lý.
- Toàn bộ trao đổi được lưu và gắn với lead.

### EF2: Thiết lập bộ tiêu chí đủ điều kiện (bởi môi giới viên)

Mô tả: môi giới viên định nghĩa và chỉnh sửa các tiêu chí mà một khách phải đạt để được đặt lịch hẹn. Đây là phần con người "ra luật" cho agent.

Ví dụ tiêu chí có thể cấu hình:
- Ngân sách tối thiểu, hoặc ngân sách phải nằm trong khoảng so với giá bất động sản.
- Tình trạng tài chính bắt buộc (ví dụ đã có thỏa thuận vay, hoặc có vốn tự có tối thiểu).
- Khu vực công ty phục vụ.
- Loại bất động sản công ty xử lý (căn hộ, nhà riêng, studio, villa).
- Mốc thời gian dự án (ví dụ mua trong vòng 6 tháng).

Quy tắc:
- Môi giới viên thiết lập và sửa tiêu chí bằng ngôn ngữ tự nhiên qua tin nhắn (ví dụ "chỉ nhận khách ngân sách trên 300k và đã được duyệt vay").
- Bộ tiêu chí được lưu và áp dụng cho mọi lead sau đó.
- Agent có thể đọc lại và giải thích bộ tiêu chí đang áp dụng khi được hỏi.

Tiêu chí nghiệm thu:
- Môi giới viên tạo, xem và sửa được tiêu chí qua hội thoại.
- Mọi đánh giá lead sau đó dùng đúng bộ tiêu chí hiện hành.

### EF3: Xác định nhu cầu và thu thập thông tin

Mô tả: agent thu thập các thông tin cần thiết của khách, ưu tiên những thông tin mà bộ tiêu chí cần để đánh giá. Cách thu thập phụ thuộc vào việc khách đã có một bất động sản cụ thể hay chưa.

Hai trường hợp khách vào:
- Trường hợp 1 (phổ biến nhất): khách đã lọc trên danh sách tin của agence và liên hệ về một bất động sản cụ thể. Agent xác nhận bất động sản đó, rồi chỉ cần thu thập thêm thông tin về khách (ngân sách, tài chính, mốc thời gian, liên hệ) để đánh giá. Không cần khám phá lại nhu cầu từ đầu.
- Trường hợp 2: khách còn mông lung, chưa chốt căn nào. Agent giúp làm rõ tiêu chí (loại, ngân sách, khu vực, số phòng), rồi đối chiếu với danh mục đã đăng của agence và đề xuất các căn phù hợp (xem EF5).

Ràng buộc về danh mục: danh mục mà agent dùng chỉ gồm những bất động sản agence đã đăng (trên web hoặc danh sách tin). Nếu một căn không có trong danh mục đã đăng thì coi như không có. Agent không hứa tìm ngoài danh mục.

Thông tin cần thu thập:
- Loại dự án: mua hoặc thuê.
- Loại bất động sản (theo thị trường Pháp): căn hộ (appartement), nhà riêng (maison), studio, villa, v.v.
- Ngân sách hoặc khoảng ngân sách.
- Khu vực mong muốn.
- Số phòng hoặc số phòng ngủ.
- Mốc thời gian của dự án.
- Tình trạng tài chính: tiền mặt, sẽ vay, đã được duyệt vay, chưa rõ.
- Thông tin liên hệ: tên và một cách liên lạc lại.

Quy tắc:
- Hỏi tự nhiên, tuần tự, lưu dần kể cả khi chưa đầy đủ, không hỏi lại điều đã biết.
- Nếu khách đã nói rõ một bất động sản cụ thể, agent gắn ngay căn đó vào hồ sơ và tập trung thu thập thông tin khách (trường hợp 1).
- Nếu khách còn mông lung, agent dẫn dắt làm rõ tiêu chí rồi đề xuất từ danh mục đã đăng (trường hợp 2).
- Agent biết khi nào đã đủ dữ liệu để chuyển sang đánh giá (EF4).

Tiêu chí nghiệm thu:
- Agent phân biệt được hai trường hợp và đi đúng luồng tương ứng.
- Mỗi thông tin được trích xuất đúng và lưu vào hồ sơ.
- Agent nhận ra khi đã đủ thông tin để đánh giá theo bộ tiêu chí.

### EF4: Đánh giá và xếp ưu tiên hồ sơ

Mô tả: agent so khớp thông tin khách với bộ tiêu chí hiện hành, đánh giá mức độ nghiêm túc của khách, và xếp ưu tiên hồ sơ. Đây là chức năng cốt lõi của sản phẩm: biến một lượng lớn yêu cầu thành một danh sách ngắn các hồ sơ đáng để môi giới viên dành thời gian.

Agent đánh giá theo hai chiều:
- Đủ điều kiện: khách có đạt các tiêu chí cứng do môi giới viên đặt ra không (ngân sách, tài chính, khu vực, loại, mốc thời gian).
- Mức độ nghiêm túc: các tín hiệu cho thấy khách thật sự có ý định, ví dụ trả lời rõ ràng và đầy đủ, kỳ vọng thực tế, có mốc thời gian cụ thể, sẵn sàng tiến tới đặt lịch.

Kết quả: đạt / không đạt / thiếu thông tin, kèm một mức ưu tiên (ví dụ cao / trung bình / thấp) phản ánh cả độ phù hợp lẫn độ nghiêm túc.

Quy tắc:
- Thiếu thông tin: agent tiếp tục hỏi (quay lại EF3).
- Đạt và nghiêm túc: chuyển sang đặt lịch (EF6) và đưa lên đầu danh sách báo cáo cho môi giới viên.
- Không đạt, hoặc đạt nhưng có dấu hiệu không nghiêm túc: xử lý theo quy định của môi giới viên (thông báo lịch sự, đánh dấu để xem lại, hoặc đề nghị liên hệ sau) và báo cáo (EF7).
- Agent ghi lại lý do của kết luận và của mức ưu tiên (tiêu chí nào đạt, tiêu chí nào không, tín hiệu nghiêm túc nào).

Tiêu chí nghiệm thu:
- Kết luận đúng với bộ tiêu chí và dữ liệu khách.
- Mỗi hồ sơ có một mức ưu tiên kèm lý do.
- Lý do đạt/không đạt và mức ưu tiên xem được trong báo cáo.

### EF5: Trả lời câu hỏi và tư vấn bất động sản

Mô tả: agent trả lời câu hỏi của khách về bất động sản và công ty, dựa trên dữ liệu thật.

Quy tắc:
- Agent chỉ dựa trên dữ liệu sẵn có. Không bịa ra bất động sản hay thông tin.
- Danh mục chỉ gồm các bất động sản agence đã đăng. Nếu một căn không có trong danh mục, agent nói rõ là hiện không có, không bịa và không hứa tìm ngoài danh mục.
- Đề xuất một đến ba bất động sản phù hợp, không liệt kê tất cả.
- Trường hợp không có kết quả được xử lý rõ ràng (gợi ý điều chỉnh tiêu chí hoặc để lại liên hệ).
- Nếu không trả lời được, agent chuyển sang EF8.

Tiêu chí nghiệm thu:
- Câu trả lời dùng đúng thông tin từ cơ sở dữ liệu.
- Câu hỏi ngoài phạm vi không bị bịa câu trả lời mà được chuyển tiếp.

### EF6: Đặt lịch hẹn tự động

Mô tả: khi khách đạt tiêu chí, agent tự đề xuất khung giờ trống và đặt lịch.

Quy tắc:
- Chỉ đặt lịch cho khách đã đạt tiêu chí (kết luận từ EF4).
- Chỉ đề xuất khung giờ thật sự trống; khung đã đặt trở thành không khả dụng.
- Khi đặt xong, trạng thái lead chuyển "đã đặt lịch hẹn", khách nhận xác nhận, môi giới viên nhận báo cáo (EF7).
- Một lịch hẹn có thể gắn với một bất động sản cụ thể hoặc để chung.

Tiêu chí nghiệm thu:
- Hai khách không đặt được cùng một khung giờ.
- Khách nhận xác nhận tóm tắt (ngày, giờ, và bất động sản nếu có).
- Lịch hẹn xuất hiện trong phần theo dõi.

### EF7: Báo cáo cho môi giới viên

Mô tả: agent chủ động báo cáo cho con người về các diễn biến quan trọng, và trả lời truy vấn của môi giới viên.

Nội dung báo cáo:
- Danh sách rút gọn theo từng bất động sản (giá trị chính): trong số N yêu cầu cho một căn, đâu là các hồ sơ đủ điều kiện và nghiêm túc, xếp theo mức ưu tiên, kèm lý do ngắn gọn.
- Khi một lead đạt tiêu chí và được đặt lịch: ai, đạt tiêu chí nào, chi tiết lịch hẹn, tóm tắt.
- Khi một lead không đạt: ai, không đạt tiêu chí nào.
- Theo yêu cầu: danh sách lead theo trạng thái, hoạt động trong ngày, tóm tắt một lead cụ thể.

Quy tắc:
- Súc tích, đúng dữ kiện, như một trợ lý báo cáo cấp trên.
- Chỉ môi giới viên được phép mới nhận báo cáo và truy vấn.

Tiêu chí nghiệm thu:
- Mỗi sự kiện quan trọng (đặt lịch, không đạt, escalation) sinh ra một báo cáo kèm bối cảnh.
- Truy vấn của môi giới viên trả về dữ liệu đúng và cập nhật.

### EF8: Chuyển tiếp lên con người kèm bản nháp trả lời

Mô tả: khi agent gặp điều không xử lý được, nó chuyển việc lên môi giới viên và soạn sẵn một bản nháp trả lời để con người duyệt.

Điều kiện kích hoạt:
- Câu hỏi ngoài phạm vi hoặc nhạy cảm.
- Khách yêu cầu rõ ràng được gặp người thật.
- Tình huống cần quyết định của con người (ví dụ thương lượng, trường hợp ngoại lệ).

Quy tắc:
- Thông báo gồm bối cảnh (lead, bất động sản, lý do, tóm tắt) và một bản nháp trả lời.
- Môi giới viên có thể duyệt, sửa rồi gửi, hoặc cho agent gửi sau khi được chấp thuận.
- Khách nhận một tin nhắn giữ nhịp (ví dụ "tôi đang kiểm tra và sẽ phản hồi sớm") để không bị bỏ lửng.

Tiêu chí nghiệm thu:
- Mỗi escalation kèm đúng bối cảnh và một bản nháp trả lời hợp lý.
- Môi giới viên duyệt hoặc sửa được bản nháp trước khi gửi.
- Khách không bị bỏ lửng trong lúc chờ con người.

### EF9: Giám sát (tùy chọn)

Mô tả: một màn hình giám sát chỉ đọc để quan sát hoạt động của agent theo thời gian thực, hữu ích cho phần trình diễn.

Nội dung: danh sách lead kèm trạng thái và kết quả đánh giá; cuộc trò chuyện của lead đang chọn, cập nhật trực tiếp; bảng lịch hẹn và lịch trống; các escalation đang chờ.

Quy tắc: chỉ đọc. Đây không phải giao diện điều phối. Toàn bộ việc điều phối vẫn qua hội thoại.

Tiêu chí nghiệm thu: tin nhắn mới, lịch hẹn mới hay escalation mới xuất hiện mà không cần tải lại; màn hình phản ánh trung thực trạng thái dữ liệu.

---

## 7. Quy tắc nghiệp vụ

### Trạng thái của một lead

| Trạng thái | Ý nghĩa |
|---|---|
| mới | Yêu cầu vừa vào, chưa có thông tin nghiệp vụ |
| đang xác định nhu cầu | Đã có ít nhất một thông tin nghiệp vụ |
| đã đánh giá - đạt | Đủ mọi tiêu chí bắt buộc |
| đã đánh giá - không đạt | Thiếu ít nhất một tiêu chí bắt buộc |
| đã đặt lịch hẹn | Một lịch hẹn được xác nhận |
| chờ con người | Đã chuyển tiếp, đang chờ môi giới viên xử lý |
| đã đóng | Không có tiếp diễn (đóng thủ công) |

### Kết luận đánh giá

- Đạt: đủ mọi tiêu chí bắt buộc của bộ tiêu chí hiện hành.
- Không đạt: thiếu ít nhất một tiêu chí bắt buộc.
- Thiếu thông tin: chưa đủ dữ liệu để kết luận, cần hỏi thêm.

Bộ tiêu chí do môi giới viên định nghĩa (EF2) là nguồn duy nhất để đánh giá. Khi tiêu chí thay đổi, các lead mới được đánh giá theo bộ tiêu chí mới nhất.

---

## 8. Mô hình dữ liệu chức năng

| Thực thể | Trường chính |
|---|---|
| Lead | định danh, định danh liên hệ, tên, số điện thoại, nguồn, bất động sản quan tâm, trạng thái, ngày tạo |
| Tiêu chí của lead | loại dự án, loại bất động sản, ngân sách tối thiểu, ngân sách tối đa, khu vực, số phòng, mốc thời gian, tài chính, ghi chú |
| Bộ tiêu chí đủ điều kiện | định danh, mô tả tự nhiên, các điều kiện (ngân sách tối thiểu, tài chính, khu vực, loại, mốc thời gian), trạng thái áp dụng |
| Kết quả đánh giá | lead, kết luận (đạt / không đạt / thiếu thông tin), mức độ nghiêm túc, mức ưu tiên, lý do, thời điểm |
| Tin nhắn | lead, người gửi (khách / AI / môi giới viên), nội dung, dấu thời gian |
| Lịch hẹn | lead, ngày và giờ, bất động sản (tùy chọn), trạng thái |
| Lịch trống | mốc bắt đầu, mốc kết thúc, đã đặt hay chưa |
| Bất động sản | tiêu đề, loại, giá, khu vực, số phòng, diện tích, mô tả |
| Báo cáo | loại, lead liên quan, nội dung, thời điểm |
| Escalation | lead, lý do, bản nháp trả lời, trạng thái (chờ duyệt / đã gửi) |

Lịch sử tin nhắn được lưu đầy đủ để phục vụ đánh giá, tóm tắt và báo cáo.

---

## 9. Các kịch bản điển hình

### Kịch bản A: khách hỏi về một căn cụ thể, đạt tiêu chí, tự đặt lịch

1. Một yêu cầu vào về một bất động sản cụ thể mà khách đã thấy trên web của agence. Agent xác nhận căn đó và thu thập thông tin khách còn thiếu (ngân sách, tài chính, mốc thời gian).
2. Agent đánh giá khách theo bộ tiêu chí: kết luận đạt.
3. Agent đề xuất khung giờ trống và đặt lịch xem nhà theo lựa chọn của khách.
4. Khách nhận xác nhận. Agent báo cáo cho môi giới viên: ai, căn nào, đạt tiêu chí nào, chi tiết lịch hẹn.

### Kịch bản B: khách không đạt tiêu chí

1. Yêu cầu vào, agent thu thập thông tin.
2. Đánh giá: không đạt (ví dụ ngân sách dưới ngưỡng, hoặc chưa có tài chính).
3. Agent xử lý theo quy định: thông báo lịch sự hoặc đánh dấu để xem lại.
4. Agent báo cáo cho môi giới viên: ai, không đạt tiêu chí nào.

### Kịch bản C: agent không trả lời được

1. Khách hỏi một điều ngoài phạm vi của agent.
2. Agent gửi cho khách một tin nhắn giữ nhịp.
3. Agent chuyển tiếp lên môi giới viên kèm bối cảnh và một bản nháp trả lời.
4. Môi giới viên duyệt hoặc sửa bản nháp, rồi gửi.

### Kịch bản D: môi giới viên thiết lập tiêu chí

1. Môi giới viên nhắn agent: "từ giờ chỉ nhận khách ngân sách trên 300k, đã được duyệt vay, khu vực Lyon".
2. Agent xác nhận và lưu bộ tiêu chí.
3. Các lead tiếp theo được đánh giá theo đúng bộ tiêu chí này.

### Kịch bản E: lọc nhiều yêu cầu cho một căn nhà (giá trị chính)

1. Một căn nhà nhận 15 yêu cầu hỏi trong vài ngày. Agent xử lý song song từng yêu cầu: xác định nhu cầu, thu thập thông tin, đánh giá hai chiều (đủ điều kiện và nghiêm túc).
2. Agent tự đặt lịch cho những hồ sơ đạt và nghiêm túc, xử lý phần còn lại theo quy định.
3. Môi giới viên nhận một danh sách rút gọn: trong 15 yêu cầu, chỉ 2 hồ sơ đủ điều kiện và nghiêm túc, xếp theo ưu tiên, kèm lý do và lịch hẹn đã đặt.
4. Môi giới viên chỉ tập trung thời gian vào 2 hồ sơ đó, thay vì sàng lọc thủ công cả 15.

---

## 10. Yêu cầu phi chức năng

- Ngôn ngữ giao tiếp với khách: tiếng Pháp (thị trường Pháp). Tài liệu kỹ thuật và trao đổi nội bộ: tiếng Việt.
- Độ phản hồi: agent trả lời trong vài giây, kèm chỉ báo đang soạn tin.
- Độ tin cậy của dữ liệu: agent không bao giờ bịa ra bất động sản, khung giờ hay thông tin dữ kiện. Mọi đánh giá dựa trên dữ liệu thật và bộ tiêu chí hiện hành.
- Tính nhất quán: agent giữ mạch cuộc trò chuyện và không hỏi lại điều đã biết.
- Bảo mật truy cập: chỉ môi giới viên được phép mới thiết lập tiêu chí, nhận báo cáo và xử lý escalation. Khách không truy cập được dữ liệu của lead khác.
- Dữ liệu cá nhân: cần lường trước việc xử lý theo quy định bảo vệ dữ liệu khi đưa vào vận hành thật. Trong demo cần có khả năng xóa dữ liệu thử nghiệm.
- Độ bền: các trường hợp lỗi (không có kết quả, khung giờ đã đặt, thiếu thông tin, tin nhắn khó hiểu) được xử lý không sập và kèm thông báo rõ ràng.

---

## 11. Khuyến nghị kỹ thuật (không bắt buộc)

Đội phát triển toàn quyền quyết định.

- Cốt lõi của agent dựa trên một mô hình ngôn ngữ có khả năng gọi công cụ (function calling). Mỗi hành động nghiệp vụ (lưu thông tin, đánh giá theo tiêu chí, tra cứu bất động sản, xem lịch trống, đặt lịch, báo cáo, tạo escalation kèm bản nháp) là một công cụ mà agent tự kích hoạt theo bối cảnh.
- Bộ tiêu chí lưu dưới dạng có cấu trúc, kèm mô tả tự nhiên do môi giới viên nhập. Agent diễn giải và áp dụng.
- Hai system prompt riêng: trợ lý khách và trợ lý môi giới viên, với hai bộ công cụ khác nhau.
- Tách logic nghiệp vụ khỏi nguồn đầu vào, để cắm kênh thật về sau.
- Danh mục bất động sản và lịch trống được giả lập cho demo.

---

## 12. Hướng phát triển sau demo

- Cắm các nguồn yêu cầu thật: form web, email, SMS, cổng như SeLoger, ghi chú cuộc gọi.
- Tích hợp CRM, lịch thật, và danh mục bất động sản thật.
- Nhiều bộ tiêu chí theo chiến dịch hoặc theo từng bất động sản.
- Hỗ trợ đa môi giới viên và đa chi nhánh với phân quyền.
- Tự động nhắc lại các lead không hoạt động.

---

## 13. Tiêu chí thành công của demo

- Từ nhiều yêu cầu cho một căn nhà, agent lọc ra được một danh sách ngắn các hồ sơ đủ điều kiện và nghiêm túc, xếp theo ưu tiên, giúp môi giới viên chỉ tập trung vào những hồ sơ đáng giá. Đây là thước đo quan trọng nhất.
- Khi một yêu cầu vào, agent tự xác định nhu cầu, đánh giá khách theo bộ tiêu chí mà con người thiết lập, và tự đặt lịch nếu đạt.
- Agent báo cáo lại cho môi giới viên sau mỗi diễn biến quan trọng.
- Khi không xử lý được, agent chuyển tiếp lên con người kèm sẵn một bản nháp trả lời.
- Agent hành xử như một trợ lý thật ngoài đời.

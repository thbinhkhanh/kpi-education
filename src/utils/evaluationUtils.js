// src/utils/evaluationUtils.js

/**
 * Lấy danh sách nhóm tiêu chí đánh giá đảng viên / cán bộ
 * @returns {Array} Mảng các nhóm tiêu chí
 */
export const getEvaluationCriteriaGroups = () => {
  return [
    {
      title: "I",
      heading: "Về phẩm chất chính trị, đạo đức, lối sống, thực hiện trách nhiệm nêu gương",
      max: 18,
      items: [
        { 
          id: "1.1", 
          text: "Tuyệt đối trung thành với Đảng, Tổ quốc và Nhân dân; kiên định chủ nghĩa Mác - Lê-nin, tư tưởng Hồ Chí Minh, mục tiêu độc lập dân tộc và chủ nghĩa xã hội. Có lập trường, quan điểm, chính trị vững vàng; kiên quyết bảo vệ nền tảng tư tưởng, Cương lĩnh chính trị, đường lối của Đảng, Hiến pháp, pháp luật của Nhà nước; đấu tranh phản bác các quan điểm sai trái, thù địch, các biểu hiện suy thoái, \"tự diễn biến\", \"tự chuyển hoá\".", 
          max: 2 
        },
        { 
          id: "1.2", 
          text: "Có tinh thần yêu nước sâu sắc, tận tụy phục vụ Nhân dân, sát cơ sở, luôn hành động vì lợi ích của Nhân dân. Đặt lợi ích của Đảng, quốc gia - dân tộc, Nhân dân, tập thể lên trên lợi ích cá nhân, sẵn sàng hy sinh vì sự nghiệp cách mạng của Đảng, vì độc lập, tự do của Tổ quốc, vì hạnh phúc của Nhân dân.", 
          max: 2 
        },
        { 
          id: "1.3", 
          text: "Chấp hành nghiêm chủ trương, đường lối, nghị quyết, chỉ thị, quy định, nguyên tắc tổ chức, kỷ luật của Đảng, nhất là nguyên tắc tập trung dân chủ, tự phê bình và phê bình; chấp hành nghiêm pháp luật của Nhà nước và quy định của cơ quan, đơn vị. Tuyệt đối chấp hành sự phân công của tổ chức, yên tâm công tác và hoàn thành tốt mọi nhiệm vụ được giao.", 
          max: 2 
        },
        { 
          id: "1.4", 
          text: "Có tinh thần tự giác, trách nhiệm cao trong nghiên cứu, học tập chủ nghĩa Mác - Lê-nin, tư tưởng Hồ Chí Minh, các nghị quyết, chỉ thị của Đảng và các chương trình bồi dưỡng, cập nhật kiến thức mới nhằm nâng cao trình độ về mọi mặt, đáp ứng yêu cầu, nhiệm vụ.", 
          max: 2 
        },
        { 
          id: "1.5", 
          text: "Có phẩm chất đạo đức, lối sống trong sáng, trung thực, khiêm tốn, chân thành, giản dị; cần, kiệm, liêm, chính, chí công vô tư; chấp hành nghiêm quy định về chuẩn mực đạo đức cách mạng của cán bộ, đảng viên trong giai đoạn mới, trách nhiệm nêu gương; không vi phạm Quy định về những điều đảng viên không được làm. Không né tránh công việc, chạy theo thành tích; không vi phạm đạo đức, lối sống đến mức bị xử lý kỷ luật.", 
          max: 2 
        },
        { 
          id: "1.6", 
          text: "Không tham vọng quyền lực; không chạy chức, chạy quyền; không tham nhũng, lãng phí, cơ hội, vụ lợi, cục bộ, lợi ích nhóm; không để gia đình, người thân và người khác lợi dụng vị trí công tác để trục lợi. Không có biểu hiện suy thoái về tư tưởng chính trị, đạo đức, lối sống, những biểu hiện \"tự diễn biến\", \"tự chuyển hoá\" trong nội bộ. Kiên quyết đấu tranh chống quan liêu, cửa quyền, tham nhũng, xa hoa, lãng phí, tiêu cực, chủ nghĩa cá nhân, lối sống cơ hội, thực dụng, bè phái, lợi ích nhóm, không nói đi đôi với làm.", 
          max: 2 
        },
        { 
          id: "1.7", 
          text: "Có uy tín cao, tiêu biểu về phẩm chất đạo đức và phong cách công tác; là trung tâm đoàn kết, thương yêu đồng chí, đồng nghiệp.", 
          max: 2 
        },
        { 
          id: "1.8", 
          text: "Có tinh thần chủ động, đổi mới sáng tạo; phấn đấu vì mục tiêu phát triển của cơ quan, đơn vị, đóng góp vào mục tiêu chung của đất nước.", 
          max: 2 
        },
        { 
          id: "1.9", 
          text: "Thực hiện việc kê khai và công khai tài sản, thu nhập theo quy định. Báo cáo đầy đủ, trung thực, cung cấp thông tin chính xác, khách quan về những nội dung liên quan đến việc thực hiện chức trách, nhiệm vụ được giao và hoạt động của cơ quan, tổ chức, đơn vị với cấp trên khi được yêu cầu.", 
          max: 2 
        }
      ]
    },
    {
      title: "II",
      heading: "Tư duy đổi mới, chiến lược, khát vọng cống hiến, dám nghĩ dám làm",
      max: 4,
      items: [
        { 
          id: "2.1", 
          text: "Có tư duy đổi mới, thích ứng với sự phát triển của thời đại và xu thế toàn cầu hoá; phương pháp làm việc khoa học, nhạy bén chính trị", 
          max: 2 
        },
        { 
          id: "2.2", 
          text: "Luôn bám sát thực tiễn, có nhiều cách làm hay, sáng tạo, đạt hiệu quả cao thực hiện nhiệm vụ", 
          max: 1 
        },
        { 
          id: "2.3", 
          text: "Nói đi đôi với làm, dám nghĩ, dám làm, dám chịu trách nhiệm, dám đột phá vì lợi ích chung. Có khả năng phân tích, dự báo tình hình, phát hiện những khó khăn, bất cập, thời cơ, thuận lợi trong thực tiễn; kịp thời đề xuất những giải pháp phù hợp, kịp thời, hiệu quả.", 
          max: 1 
        }
      ]
    },
    {
      title: "III",
      heading: "Về tự phê bình và phê bình, tự soi, tự sửa, khắc phục hạn chế, khuyết điểm",
      max: 8,
      items: [
        { 
          id: "3.1", 
          text: "Chủ động, nghiêm túc thực hiện tự phê bình và phê bình, có tinh thần cầu thị và tiếp thu phản biện, góp ý.", 
          max: 2 
        },
        { 
          id: "3.2", 
          text: "Có kế hoạch rõ ràng và quyết liệt trong khắc phục hạn chế, khuyết điểm đã được chỉ ra.", 
          max: 2 
        },
        { 
          id: "3.3", 
          text: "Kết quả khắc phục hoàn thành từ >= 80% nội dung, có tiến bộ rõ, được tổ chức đánh giá tốt; không để tái diễn tồn tại.", 
          max: 2 
        },
        { 
          id: "3.4", 
          text: "Tự soi, tự sửa trên tinh thần trách nhiệm chính trị cao, không né tránh, không đổ lỗi.", 
          max: 2 
        }
      ]
    }
  ];
};

/**
 * Tạo trạng thái mặc định chọn tất cả các ô "Đảm bảo (X)" (giá trị true)
 * @returns {Object} Object chứa key là id tiêu chí và value là true
 */
export const getDefaultCriteriaA = () => {
  const groups = getEvaluationCriteriaGroups();
  const initialCriteriaA = {};
  groups.forEach((group) => {
    group.items.forEach((item) => {
      initialCriteriaA[item.id] = true;
    });
  });
  return initialCriteriaA;
};

/**
 * Tạo trạng thái mặc định cho điểm đạt bằng đúng điểm tối đa (max) của từng tiêu chí
 * @returns {Object} Object chứa key là id tiêu chí và value là số điểm max
 */
export const getDefaultAchievedScores = () => {
  const groups = getEvaluationCriteriaGroups();
  const initialScores = {};
  groups.forEach((group) => {
    group.items.forEach((item) => {
      initialScores[item.id] = item.max ?? 2;
    });
  });
  return initialScores;
};
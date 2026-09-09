import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { faqsData, faqCategories } from '../../../data';

export const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('all');

  const faqs = faqsData;

  const filteredFaqs = faqs.filter((faq) => {
    return activeTab === 'all' || faq.category === activeTab;
  });

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 bg-gradient-to-b from-emerald-50/40 via-emerald-50/20 to-white relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-xs border border-emerald-200"
          >
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            Giải đáp thắc mắc khách hàng
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-950 tracking-tight"
          >
            Câu Hỏi Thường Gặp (FAQ)
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-emerald-900/70 font-medium"
          >
            Giải đáp hầu hết thắc mắc về cách sử dụng ứng dụng và các gói dịch vụ của Friggy.
          </motion.p>

          {/* Category Tabs */}
          <div className="flex justify-center gap-2 pt-2">
            {faqCategories.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-emerald-800 hover:bg-emerald-100/60 border border-emerald-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, index) => {
                const isOpen = openIndex === index;
                return (
                  <motion.div
                    key={faq.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                      isOpen
                        ? 'bg-white border-2 border-emerald-500 shadow-xl shadow-emerald-500/10'
                        : 'bg-white/80 hover:bg-white border-emerald-100 shadow-xs'
                    }`}
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full p-6 text-left flex items-center justify-between gap-4 font-bold text-base sm:text-lg text-emerald-950 hover:text-emerald-700 transition-colors"
                    >
                      <span>{faq.question}</span>
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform duration-300 flex-shrink-0 ${
                          isOpen
                            ? 'rotate-180 bg-emerald-500 text-white shadow-md'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        <ChevronDown className="w-5 h-5" />
                      </div>
                    </button>

                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-6 pb-6 text-sm text-emerald-900/80 leading-relaxed font-medium border-t border-emerald-50 pt-4"
                      >
                        {faq.answer}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-emerald-100">
                <p className="text-sm font-semibold text-emerald-800/70">
                  Không tìm thấy câu hỏi phù hợp.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default FaqSection;

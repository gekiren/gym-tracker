import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';

interface BodyGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function BodyGuideModal({ visible, onClose }: BodyGuideModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <Ionicons name="book-outline" size={22} color={Theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.modalTitle}>体組成・骨格測定ガイド</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 米海軍式 体脂肪率推定 */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calculator" size={20} color="#fb923c" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>米海軍式 体脂肪率推定（US Navy Method）</Text>
              </View>
              <Text style={styles.descText}>
                アメリカ海軍（US Navy）が兵士の体脂肪率測定に正式採用している身体周囲長測定法です。
                高価なDEXAスキャンや体脂肪計の水分変動に左右されにくく、メジャー1本で身体密度を高い精度で推定できます。
              </Text>

              <Text style={styles.subTitle}>📏 正しい測定位置</Text>
              <View style={styles.guideItem}>
                <Text style={styles.guideItemTitle}>• 首回り (Neck):</Text>
                <Text style={styles.guideItemText}>
                  喉仏（甲状軟骨）のすぐ下、首の最も細い部分を水平に測定します。肩をリラックスさせて測ってください。
                </Text>
              </View>
              <View style={styles.guideItem}>
                <Text style={styles.guideItemTitle}>• ウエスト (Waist):</Text>
                <Text style={styles.guideItemText}>
                  男性はおへその位置、女性はくびれの最も細い位置で、息を吐いた自然な状態で水平に測定します（お腹を引っ込めないように注意）。
                </Text>
              </View>
              <View style={styles.guideItem}>
                <Text style={styles.guideItemTitle}>• ヒップ (Hip - 女性のみ):</Text>
                <Text style={styles.guideItemText}>
                  お尻の最も突き出ている最大周囲長を水平に測定します。
                </Text>
              </View>
            </View>

            {/* ケーシー・バット博士 筋肥大限界モデル */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="sparkles" size={20} color="#a78bfa" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>ケーシー・バット博士モデル（Dr. Casey Butt）</Text>
              </View>
              <Text style={styles.descText}>
                筋生理学者のケーシー・バット博士（Ph.D.）が、薬物（アナボリックステロイド）を使用しないトップクラスの歴代ナチュラルボディビルダー数百名の骨格・体組成データを6年間にわたり統計解析して導き出した、ナチュラル筋肥大の生理的・物理的上限予測モデルです。
              </Text>
              <Text style={styles.descText}>
                筋肉は骨格フレーム（腱・関節）に付着するため、手首や足首などの関節骨格サイズが最大の筋肉量を物理的に制約するというバイオメカニクスの原理に基づいています。
              </Text>

              <Text style={styles.subTitle}>📏 骨格測定位置（※重要）</Text>
              <View style={styles.guideItem}>
                <Text style={styles.guideItemTitle}>• 手首最小囲 (Wrist):</Text>
                <Text style={styles.guideItemText}>
                  手首のくるぶしのような骨（橈骨・尺骨の茎状突起）と手のひらの間にある、最も細い部分をメジャーでしっかりと密着させて測定します。
                </Text>
              </View>
              <View style={styles.guideItem}>
                <Text style={styles.guideItemTitle}>• 足首最小囲 (Ankle):</Text>
                <Text style={styles.guideItemText}>
                  内くるぶし・外くるぶしのすぐ上にある、下腿（すね）の最も細い最小周囲長を測定します。
                </Text>
              </View>
            </View>

            {/* FFMIについて */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="fitness" size={20} color="#38bdf8" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>FFMI（除脂肪筋肉量指数）とは？</Text>
              </View>
              <Text style={styles.descText}>
                BMIから体脂肪を除き、身長に対する純粋な筋肉量の多さを数値化した指標です。
              </Text>
              <View style={styles.ffmiTable}>
                <Text style={styles.ffmiRow}>• <Text style={styles.ffmiBold}>18〜19</Text>: 一般的な平均値（筋トレ未経験）</Text>
                <Text style={styles.ffmiRow}>• <Text style={styles.ffmiBold}>20〜21</Text>: 筋トレ中級者（引き締まった筋肉質）</Text>
                <Text style={styles.ffmiRow}>• <Text style={styles.ffmiBold}>22〜23</Text>: 筋トレ上級者（優れたフィジーク）</Text>
                <Text style={styles.ffmiRow}>• <Text style={styles.ffmiBold}>24〜25</Text>: ナチュラルの最高峰・遺伝的限界域</Text>
              </View>
            </View>
          </ScrollView>

          {/* Close Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.okBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.okBtnText}>理解しました</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  descText: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    lineHeight: 19,
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginTop: 6,
    marginBottom: 6,
  },
  guideItem: {
    marginBottom: 6,
  },
  guideItemTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Theme.colors.primary,
  },
  guideItemText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    lineHeight: 17,
    marginTop: 2,
  },
  ffmiTable: {
    marginTop: 4,
    gap: 4,
  },
  ffmiRow: {
    fontSize: 12,
    color: Theme.colors.textMuted,
  },
  ffmiBold: {
    color: Theme.colors.text,
    fontWeight: 'bold',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  okBtn: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
  },
  okBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
